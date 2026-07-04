-- ============================================================
-- MONEYBALL ALPHA — COMMIT MATCH RESULT
-- The single atomic write path for a simulated match. Called
-- only from /api/simulate-match, after that route has already
-- validated the LLM's response server-side (schema shape, every
-- goal/card/injury commentary line resolves to a real event,
-- every player name resolved to a real roster player_id).
--
-- The commentary_needs_event CHECK constraint on commentary_lines
-- (see core schema migration) is a second, independent
-- enforcement of "compute before narrate": even if the route's
-- own validation had a bug, Postgres itself refuses to store a
-- goal/card/injury commentary line with no backing event.
-- ============================================================
-- ------------------------------------------------------------
-- PLAYER_MATCH_STATS — one row per player per fixture they were
-- part of the matchday squad for. This is what the Player
-- Progression report reads as a time series; the cumulative
-- fields on `players` (appearances, goals, rating_sum, ...) are
-- running totals derived from the same writes.
-- ------------------------------------------------------------
create table player_match_stats (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references fixtures(id),
  player_id uuid not null references players(id),
  club_id uuid not null references clubs(id),
  matchweek int not null,
  started boolean not null default false,
  minutes int not null default 0,
  rating numeric(4,2),
  goals int not null default 0,
  assists int not null default 0,
  yellow_cards int not null default 0,
  red_cards int not null default 0,
  fitness_after numeric(5,2),
  morale_after numeric(5,2),
  injured boolean not null default false,
  created_at timestamptz not null default now(),
  unique (fixture_id, player_id)
);

alter table player_match_stats enable row level security;
create policy player_match_stats_select on player_match_stats for select to authenticated using (true);
create policy player_match_stats_admin_write on player_match_stats for all to authenticated using (is_admin()) with check (is_admin());

create or replace function commit_match_result(
  p_fixture_id uuid,
  p_home_goals int,
  p_away_goals int,
  p_events jsonb,
  p_commentary jsonb,
  p_possession jsonb,
  p_shots jsonb,
  p_sot jsonb,
  p_corners jsonb,
  p_cards jsonb,
  p_motm_player_id uuid,
  -- Array of per-player deltas computed server-side in TypeScript
  -- (src/lib/simulation/player-updates.ts) from the validated events +
  -- lineups: {player_id, appearances_delta, minutes_delta, goals_delta,
  -- assists_delta, yellow_delta, red_delta, fitness_delta, morale_delta,
  -- rating_delta, set_injured, set_suspended, injury_return_matchweek}.
  p_player_updates jsonb
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_event jsonb;
  v_comment jsonb;
  v_pu jsonb;
  v_event_ids uuid[] := '{}';
  v_new_id uuid;
  v_idx int;
  v_matchweek int;
  v_owner_club_id uuid;
  v_fitness_after numeric;
  v_morale_after numeric;
  v_injured_after boolean;
begin
  if not (is_admin() or auth.role() = 'service_role') then
    raise exception 'Only admin or the simulation service may commit a match result';
  end if;

  if exists (select 1 from fixtures where id = p_fixture_id and played = true) then
    raise exception 'Fixture % has already been played', p_fixture_id;
  end if;

  for v_event in select * from jsonb_array_elements(p_events) loop
    insert into match_events (fixture_id, minute, type, side, player_id, assist_player_id, card_type, detail)
    values (
      p_fixture_id,
      (v_event->>'minute')::int,
      v_event->>'type',
      v_event->>'side',
      nullif(v_event->>'player_id', '')::uuid,
      nullif(v_event->>'assist_player_id', '')::uuid,
      nullif(v_event->>'card_type', ''),
      v_event->>'detail'
    )
    returning id into v_new_id;
    v_event_ids := array_append(v_event_ids, v_new_id);
  end loop;

  for v_comment in select * from jsonb_array_elements(p_commentary) loop
    v_idx := (v_comment->>'event_index')::int;
    insert into commentary_lines (fixture_id, minute, text, type, ref_event_id)
    values (
      p_fixture_id,
      (v_comment->>'minute')::int,
      v_comment->>'text',
      v_comment->>'type',
      case when v_idx is null then null else v_event_ids[v_idx + 1] end
    );
  end loop;

  update fixtures set
    played = true,
    home_goals = p_home_goals,
    away_goals = p_away_goals,
    possession = p_possession,
    shots = p_shots,
    sot = p_sot,
    corners = p_corners,
    cards = p_cards,
    motm_player_id = p_motm_player_id
  where id = p_fixture_id;

  select matchweek into v_matchweek from fixtures where id = p_fixture_id;

  for v_pu in select * from jsonb_array_elements(p_player_updates) loop
    update players set
      appearances = appearances + coalesce((v_pu->>'appearances_delta')::int, 0),
      minutes_played = minutes_played + coalesce((v_pu->>'minutes_delta')::int, 0),
      goals = goals + coalesce((v_pu->>'goals_delta')::int, 0),
      assists = assists + coalesce((v_pu->>'assists_delta')::int, 0),
      yellow_cards = yellow_cards + coalesce((v_pu->>'yellow_delta')::int, 0),
      red_cards = red_cards + coalesce((v_pu->>'red_delta')::int, 0),
      fitness = greatest(0, least(100, fitness + coalesce((v_pu->>'fitness_delta')::numeric, 0))),
      morale = greatest(0, least(100, morale + coalesce((v_pu->>'morale_delta')::numeric, 0))),
      rating_sum = rating_sum + coalesce((v_pu->>'rating_delta')::numeric, 0),
      injured = coalesce((v_pu->>'set_injured')::boolean, injured),
      suspended = coalesce((v_pu->>'set_suspended')::boolean, suspended),
      injury_return_matchweek = case
        when v_pu ? 'injury_return_matchweek' and v_pu->>'injury_return_matchweek' is not null
        then (v_pu->>'injury_return_matchweek')::int
        else injury_return_matchweek
      end
    where id = (v_pu->>'player_id')::uuid
    returning owner_club_id, fitness, morale, injured
      into v_owner_club_id, v_fitness_after, v_morale_after, v_injured_after;

    insert into player_match_stats (
      fixture_id, player_id, club_id, matchweek, started, minutes, rating,
      goals, assists, yellow_cards, red_cards, fitness_after, morale_after, injured
    ) values (
      p_fixture_id,
      (v_pu->>'player_id')::uuid,
      v_owner_club_id,
      v_matchweek,
      coalesce((v_pu->>'appearances_delta')::int, 0) > 0,
      coalesce((v_pu->>'minutes_delta')::int, 0),
      nullif((v_pu->>'rating_delta')::numeric, 0),
      coalesce((v_pu->>'goals_delta')::int, 0),
      coalesce((v_pu->>'assists_delta')::int, 0),
      coalesce((v_pu->>'yellow_delta')::int, 0),
      coalesce((v_pu->>'red_delta')::int, 0),
      v_fitness_after,
      v_morale_after,
      v_injured_after
    )
    on conflict (fixture_id, player_id) do nothing;
  end loop;

  perform recompute_club_record(p_fixture_id);
end;
$$;

grant execute on function commit_match_result(
  uuid, int, int, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, uuid, jsonb
) to authenticated, service_role;

revoke execute on function commit_match_result(
  uuid, int, int, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, uuid, jsonb
) from public;
