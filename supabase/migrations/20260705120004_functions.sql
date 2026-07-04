-- ============================================================
-- MONEYBALL ALPHA — RPC FUNCTIONS
-- Every write that needs a server-enforced invariant (budget,
-- ownership, formation legality, lock state, admin-only control)
-- lives here as a SECURITY DEFINER function, so the browser can
-- never bypass validation by calling PostgREST directly.
-- ============================================================

-- ------------------------------------------------------------
-- REGISTRATION
-- ------------------------------------------------------------
create or replace function register_club(p_club_id uuid, p_name text, p_owner_name text)
returns clubs
language plpgsql
security definer set search_path = public
as $$
declare
  v_club clubs;
begin
  select * into v_club from clubs where id = p_club_id for update;
  if not found then
    raise exception 'Club not found';
  end if;
  if v_club.owner_name is not null then
    raise exception 'This club has already been registered';
  end if;
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Club name is required';
  end if;
  if p_owner_name is null or length(trim(p_owner_name)) = 0 then
    raise exception 'Owner name is required';
  end if;

  update clubs set name = p_name, owner_name = p_owner_name where id = p_club_id
    returning * into v_club;
  return v_club;
end;
$$;
grant execute on function register_club(uuid, text, text) to authenticated;

create or replace function assign_club_owner(p_profile_id uuid, p_club_id uuid)
returns profiles
language plpgsql
security definer set search_path = public
as $$
declare
  v_profile profiles;
begin
  if not is_admin() then
    raise exception 'Only admin can assign club owners';
  end if;
  update profiles set role = 'club_owner', club_id = p_club_id where id = p_profile_id
    returning * into v_profile;
  if not found then
    raise exception 'Profile not found';
  end if;
  return v_profile;
end;
$$;
grant execute on function assign_club_owner(uuid, uuid) to authenticated;

-- ------------------------------------------------------------
-- AUCTION
-- Only one lot is ever "live" at a time (enforced by convention
-- in open_lot/confirm_sale, not a DB constraint) so a club can
-- never have two simultaneously-pending winning bids across
-- different lots — this is what makes the single-lot budget
-- check in place_bid() sufficient without also summing exposure
-- across other open lots.
-- ------------------------------------------------------------
create or replace function open_lot(p_lot_id uuid)
returns auction_lots
language plpgsql
security definer set search_path = public
as $$
declare
  v_lot auction_lots;
begin
  if not is_admin() then
    raise exception 'Only admin can control the auction';
  end if;
  select * into v_lot from auction_lots where id = p_lot_id for update;
  if not found then
    raise exception 'Lot not found';
  end if;
  if v_lot.status = 'sold' then
    raise exception 'Lot already sold';
  end if;

  update auction_lots set status = 'live', started_at = now(), ended_at = null
    where id = p_lot_id
    returning * into v_lot;

  update auction_state set current_lot_id = p_lot_id, is_open = true where id = true;
  return v_lot;
end;
$$;
grant execute on function open_lot(uuid) to authenticated;

create or replace function mark_lot_unsold(p_lot_id uuid)
returns auction_lots
language plpgsql
security definer set search_path = public
as $$
declare
  v_lot auction_lots;
begin
  if not is_admin() then
    raise exception 'Only admin can control the auction';
  end if;

  update auction_lots set status = 'unsold', ended_at = now() where id = p_lot_id
    returning * into v_lot;
  if not found then
    raise exception 'Lot not found';
  end if;

  update auction_state set current_lot_id = null, is_open = false
    where id = true and current_lot_id = p_lot_id;
  return v_lot;
end;
$$;
grant execute on function mark_lot_unsold(uuid) to authenticated;

create or replace function place_bid(p_lot_id uuid, p_amount numeric)
returns auction_bids
language plpgsql
security definer set search_path = public
as $$
declare
  v_club_id uuid := current_club_id();
  v_lot auction_lots;
  v_item_base numeric;
  v_current_high numeric;
  v_club_budget numeric;
  v_bid auction_bids;
begin
  if v_club_id is null then
    raise exception 'Only a club owner may place a bid';
  end if;

  select * into v_lot from auction_lots where id = p_lot_id for update;
  if not found then
    raise exception 'Lot not found';
  end if;
  if v_lot.status <> 'live' then
    raise exception 'This lot is not currently live';
  end if;

  select coalesce(max(amount), 0) into v_current_high from auction_bids where lot_id = p_lot_id;

  if v_lot.item_type = 'stadium' then
    select base_price into v_item_base from stadiums where id = v_lot.item_id;
  elsif v_lot.item_type = 'manager' then
    select base_price into v_item_base from managers where id = v_lot.item_id;
  else
    select base_price into v_item_base from players where id = v_lot.item_id;
  end if;

  if p_amount < v_item_base then
    raise exception 'Bid must be at least the base price (%)', round(v_item_base, 2);
  end if;
  if p_amount <= v_current_high then
    raise exception 'Bid must exceed the current highest bid (%)', round(v_current_high, 2);
  end if;

  select budget into v_club_budget from clubs where id = v_club_id for update;
  if p_amount > v_club_budget then
    raise exception 'Bid exceeds your remaining budget (% remaining)', round(v_club_budget, 2);
  end if;

  insert into auction_bids (lot_id, club_id, amount) values (p_lot_id, v_club_id, p_amount)
    returning * into v_bid;
  return v_bid;
end;
$$;
grant execute on function place_bid(uuid, numeric) to authenticated;

create or replace function confirm_sale(p_lot_id uuid)
returns auction_lots
language plpgsql
security definer set search_path = public
as $$
declare
  v_lot auction_lots;
  v_winner record;
begin
  if not is_admin() then
    raise exception 'Only admin can confirm a sale';
  end if;

  select * into v_lot from auction_lots where id = p_lot_id for update;
  if not found then
    raise exception 'Lot not found';
  end if;
  if v_lot.status = 'sold' then
    raise exception 'Lot already sold';
  end if;

  select club_id, amount into v_winner
    from auction_bids where lot_id = p_lot_id
    order by amount desc, created_at asc limit 1;

  if not found then
    raise exception 'No bids placed on this lot — use mark_lot_unsold instead';
  end if;

  update clubs set budget = budget - v_winner.amount, cash = cash - v_winner.amount
    where id = v_winner.club_id;

  if v_lot.item_type = 'stadium' then
    update stadiums set owner_club_id = v_winner.club_id, sold = true where id = v_lot.item_id;
  elsif v_lot.item_type = 'manager' then
    update managers set owner_club_id = v_winner.club_id, sold = true where id = v_lot.item_id;
  else
    update players set owner_club_id = v_winner.club_id, sold = true where id = v_lot.item_id;
  end if;

  update auction_lots set status = 'sold', winning_club_id = v_winner.club_id,
      final_price = v_winner.amount, ended_at = now()
    where id = p_lot_id
    returning * into v_lot;

  update auction_state set current_lot_id = null, is_open = false
    where id = true and current_lot_id = p_lot_id;

  return v_lot;
end;
$$;
grant execute on function confirm_sale(uuid) to authenticated;

-- ------------------------------------------------------------
-- SQUAD SUBMISSION
-- fixture_id = null means the club's standing "default lineup".
-- ------------------------------------------------------------
create or replace function submit_lineup(
  p_club_id uuid,
  p_fixture_id uuid,
  p_starting_xi uuid[],
  p_bench uuid[],
  p_formation text,
  p_style text,
  p_defensive_line text,
  p_tempo text,
  p_captain_id uuid,
  p_instructions text
)
returns lineups
language plpgsql
security definer set search_path = public
as $$
declare
  v_caller_club_id uuid := current_club_id();
  v_effective_club_id uuid;
  v_gk int;
  v_def int;
  v_mid int;
  v_fwd int;
  v_req_def int;
  v_req_mid int;
  v_req_fwd int;
  v_owned_count int;
  v_bad_status_count int;
  v_lineup lineups;
  v_existing lineups;
  v_fixture fixtures;
  v_bench_safe uuid[] := coalesce(p_bench, array[]::uuid[]);
begin
  if is_admin() then
    v_effective_club_id := p_club_id;
  else
    if v_caller_club_id is null or v_caller_club_id <> p_club_id then
      raise exception 'You may only submit a lineup for your own club';
    end if;
    v_effective_club_id := p_club_id;
  end if;

  if p_starting_xi is null or array_length(p_starting_xi, 1) <> 11 then
    raise exception 'Starting XI must have exactly 11 players';
  end if;
  if array_length(v_bench_safe, 1) is not null and array_length(v_bench_safe, 1) > 5 then
    raise exception 'Bench cannot have more than 5 players';
  end if;
  if p_captain_id is null or not (p_captain_id = any(p_starting_xi)) then
    raise exception 'Captain must be one of the starting XI';
  end if;

  select count(*) into v_owned_count from players
    where id = any(p_starting_xi || v_bench_safe) and owner_club_id = v_effective_club_id;
  if v_owned_count <> (array_length(p_starting_xi, 1) + coalesce(array_length(v_bench_safe, 1), 0)) then
    raise exception 'All selected players must belong to your squad';
  end if;

  select count(*) into v_bad_status_count from players
    where id = any(p_starting_xi) and (injured = true or suspended = true);
  if v_bad_status_count > 0 then
    raise exception 'Starting XI includes an injured or suspended player';
  end if;

  select
    count(*) filter (where position = 'GK'),
    count(*) filter (where position in ('CB', 'LB', 'RB')),
    count(*) filter (where position in ('CDM', 'CM', 'CAM')),
    count(*) filter (where position in ('LW', 'RW', 'ST'))
  into v_gk, v_def, v_mid, v_fwd
  from players where id = any(p_starting_xi);

  if v_gk <> 1 then
    raise exception 'Starting XI must include exactly 1 goalkeeper';
  end if;

  case p_formation
    when '4-3-3' then v_req_def := 4; v_req_mid := 3; v_req_fwd := 3;
    when '4-4-2' then v_req_def := 4; v_req_mid := 4; v_req_fwd := 2;
    when '4-2-3-1' then v_req_def := 4; v_req_mid := 5; v_req_fwd := 1;
    when '3-5-2' then v_req_def := 3; v_req_mid := 5; v_req_fwd := 2;
    when '3-4-3' then v_req_def := 3; v_req_mid := 4; v_req_fwd := 3;
    else raise exception 'Unknown formation %', p_formation;
  end case;

  if v_req_def <> v_def or v_req_mid <> v_mid or v_req_fwd <> v_fwd then
    raise exception 'Starting XI (% DEF, % MID, % FWD) does not match formation % (needs % DEF, % MID, % FWD)',
      v_def, v_mid, v_fwd, p_formation, v_req_def, v_req_mid, v_req_fwd;
  end if;

  if p_fixture_id is not null then
    select * into v_fixture from fixtures where id = p_fixture_id;
    if not found then
      raise exception 'Fixture not found';
    end if;
    if v_fixture.played then
      raise exception 'Fixture has already been played';
    end if;
    if not is_admin() and v_fixture.lineup_lock_at is not null and now() >= v_fixture.lineup_lock_at then
      raise exception 'The lineup deadline for this fixture has passed';
    end if;
  end if;

  select * into v_existing from lineups
    where club_id = v_effective_club_id and fixture_id is not distinct from p_fixture_id;

  if found and v_existing.locked and not is_admin() then
    raise exception 'This lineup has been locked and can no longer be edited';
  end if;

  if found then
    update lineups set
      starting_xi = p_starting_xi,
      bench = v_bench_safe,
      formation = p_formation,
      style = p_style,
      defensive_line = p_defensive_line,
      tempo = p_tempo,
      captain_id = p_captain_id,
      instructions = p_instructions,
      submitted_at = now()
    where id = v_existing.id
    returning * into v_lineup;
  else
    insert into lineups (
      club_id, fixture_id, starting_xi, bench, formation, style,
      defensive_line, tempo, captain_id, instructions
    )
    values (
      v_effective_club_id, p_fixture_id, p_starting_xi, v_bench_safe, p_formation, p_style,
      p_defensive_line, p_tempo, p_captain_id, p_instructions
    )
    returning * into v_lineup;
  end if;

  if p_fixture_id is null then
    update clubs set
      formation = p_formation,
      tactical_style = p_style,
      defensive_line = p_defensive_line,
      tempo = p_tempo,
      captain_id = p_captain_id,
      match_instructions = p_instructions
    where id = v_effective_club_id;
  end if;

  return v_lineup;
end;
$$;
grant execute on function submit_lineup(uuid, uuid, uuid[], uuid[], text, text, text, text, uuid, text) to authenticated;

create or replace function lock_lineup(p_lineup_id uuid)
returns lineups
language plpgsql
security definer set search_path = public
as $$
declare
  v_lineup lineups;
begin
  if not is_admin() then
    raise exception 'Only admin can lock a lineup';
  end if;
  update lineups set locked = true where id = p_lineup_id returning * into v_lineup;
  if not found then
    raise exception 'Lineup not found';
  end if;
  return v_lineup;
end;
$$;
grant execute on function lock_lineup(uuid) to authenticated;

-- ------------------------------------------------------------
-- LEAGUE RECORD (called once by the server after a fixture's
-- result has been persisted by /api/simulate-match). Restricted
-- to admin/service_role — never authenticated club owners — and
-- guarded by fixtures.stats_applied so a retry can never double
-- count a result into the league table.
-- ------------------------------------------------------------
create or replace function recompute_club_record(p_fixture_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_fixture fixtures;
begin
  if not (is_admin() or auth.role() = 'service_role') then
    raise exception 'Only admin or the simulation service may recompute club records';
  end if;

  select * into v_fixture from fixtures where id = p_fixture_id for update;
  if not found then
    raise exception 'Fixture not found';
  end if;
  if not v_fixture.played or v_fixture.home_goals is null or v_fixture.away_goals is null then
    raise exception 'Fixture has no recorded result yet';
  end if;
  if v_fixture.stats_applied then
    raise exception 'Fixture % has already had its result applied to club records', p_fixture_id;
  end if;

  update fixtures set stats_applied = true where id = p_fixture_id;

  perform 1 from clubs where id in (v_fixture.home_club_id, v_fixture.away_club_id) for update;

  update clubs set
    played = played + 1,
    gf = gf + v_fixture.home_goals,
    ga = ga + v_fixture.away_goals,
    won = won + (case when v_fixture.home_goals > v_fixture.away_goals then 1 else 0 end),
    drawn = drawn + (case when v_fixture.home_goals = v_fixture.away_goals then 1 else 0 end),
    lost = lost + (case when v_fixture.home_goals < v_fixture.away_goals then 1 else 0 end),
    points = points + (case
      when v_fixture.home_goals > v_fixture.away_goals then 3
      when v_fixture.home_goals = v_fixture.away_goals then 1
      else 0 end),
    win_streak = case when v_fixture.home_goals > v_fixture.away_goals then win_streak + 1 else 0 end,
    biggest_win = case
      when v_fixture.home_goals > v_fixture.away_goals
        and (biggest_win is null or (v_fixture.home_goals - v_fixture.away_goals) > (biggest_win->>'margin')::int)
      then jsonb_build_object('opponent_club_id', v_fixture.away_club_id, 'for', v_fixture.home_goals,
             'against', v_fixture.away_goals, 'margin', v_fixture.home_goals - v_fixture.away_goals,
             'matchweek', v_fixture.matchweek)
      else biggest_win end,
    biggest_loss = case
      when v_fixture.home_goals < v_fixture.away_goals
        and (biggest_loss is null or (v_fixture.away_goals - v_fixture.home_goals) > (biggest_loss->>'margin')::int)
      then jsonb_build_object('opponent_club_id', v_fixture.away_club_id, 'for', v_fixture.home_goals,
             'against', v_fixture.away_goals, 'margin', v_fixture.away_goals - v_fixture.home_goals,
             'matchweek', v_fixture.matchweek)
      else biggest_loss end
  where id = v_fixture.home_club_id;

  update clubs set
    played = played + 1,
    gf = gf + v_fixture.away_goals,
    ga = ga + v_fixture.home_goals,
    won = won + (case when v_fixture.away_goals > v_fixture.home_goals then 1 else 0 end),
    drawn = drawn + (case when v_fixture.away_goals = v_fixture.home_goals then 1 else 0 end),
    lost = lost + (case when v_fixture.away_goals < v_fixture.home_goals then 1 else 0 end),
    points = points + (case
      when v_fixture.away_goals > v_fixture.home_goals then 3
      when v_fixture.away_goals = v_fixture.home_goals then 1
      else 0 end),
    win_streak = case when v_fixture.away_goals > v_fixture.home_goals then win_streak + 1 else 0 end,
    biggest_win = case
      when v_fixture.away_goals > v_fixture.home_goals
        and (biggest_win is null or (v_fixture.away_goals - v_fixture.home_goals) > (biggest_win->>'margin')::int)
      then jsonb_build_object('opponent_club_id', v_fixture.home_club_id, 'for', v_fixture.away_goals,
             'against', v_fixture.home_goals, 'margin', v_fixture.away_goals - v_fixture.home_goals,
             'matchweek', v_fixture.matchweek)
      else biggest_win end,
    biggest_loss = case
      when v_fixture.away_goals < v_fixture.home_goals
        and (biggest_loss is null or (v_fixture.home_goals - v_fixture.away_goals) > (biggest_loss->>'margin')::int)
      then jsonb_build_object('opponent_club_id', v_fixture.home_club_id, 'for', v_fixture.away_goals,
             'against', v_fixture.home_goals, 'margin', v_fixture.home_goals - v_fixture.away_goals,
             'matchweek', v_fixture.matchweek)
      else biggest_loss end
  where id = v_fixture.away_club_id;
end;
$$;
grant execute on function recompute_club_record(uuid) to authenticated, service_role;

-- ------------------------------------------------------------
-- FINANCE
-- Ledger walk per matchweek: opening_cash -> + stadium_revenue
-- (home fixtures only) -> + prize_money (season-end only) ->
-- - maintenance -> +/- transfers_delta -> closing_cash.
-- ------------------------------------------------------------
create table transfers (
  id uuid primary key default gen_random_uuid(),
  matchweek int not null check (matchweek in (4, 7)),
  buyer_club_id uuid not null references clubs(id),
  seller_club_id uuid references clubs(id),
  player_id uuid references players(id),
  amount numeric(12,2) not null check (amount > 0),
  note text,
  created_at timestamptz not null default now()
);

alter table transfers enable row level security;
create policy transfers_select on transfers for select to authenticated using (true);
create policy transfers_admin_write on transfers for all to authenticated using (is_admin()) with check (is_admin());

-- record_transfer() deducts the buyer's budget immediately (it
-- reserves spending power against the season cap, same as an
-- auction win) but does NOT touch cash — cash moves through the
-- matchweek ledger via apply_finance_matchweek()'s transfers_delta
-- so the finance_log row for MW4/MW7 shows the transfer in context.
create or replace function record_transfer(
  p_matchweek int,
  p_buyer_club_id uuid,
  p_seller_club_id uuid,
  p_player_id uuid,
  p_amount numeric,
  p_note text
)
returns transfers
language plpgsql
security definer set search_path = public
as $$
declare
  v_transfer transfers;
  v_buyer_budget numeric;
begin
  if not is_admin() then
    raise exception 'Only admin can record transfers';
  end if;
  if p_matchweek not in (4, 7) then
    raise exception 'Transfers are only allowed during matchweeks 4 and 7';
  end if;
  if p_amount <= 0 then
    raise exception 'Transfer amount must be positive';
  end if;

  select budget into v_buyer_budget from clubs where id = p_buyer_club_id for update;
  if v_buyer_budget is null then
    raise exception 'Buyer club not found';
  end if;
  if p_amount > v_buyer_budget then
    raise exception 'Buyer does not have enough remaining budget';
  end if;

  if p_player_id is not null then
    update players set owner_club_id = p_buyer_club_id, sold = true where id = p_player_id;
  end if;

  update clubs set budget = budget - p_amount where id = p_buyer_club_id;
  if p_seller_club_id is not null then
    update clubs set budget = budget + p_amount where id = p_seller_club_id;
  end if;

  insert into transfers (matchweek, buyer_club_id, seller_club_id, player_id, amount, note)
  values (p_matchweek, p_buyer_club_id, p_seller_club_id, p_player_id, p_amount, p_note)
  returning * into v_transfer;

  return v_transfer;
end;
$$;
grant execute on function record_transfer(int, uuid, uuid, uuid, numeric, text) to authenticated;

create or replace function apply_finance_matchweek(p_matchweek int)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_club record;
  v_stadium_revenue numeric;
  v_maintenance numeric;
  v_prize numeric;
  v_transfers_delta numeric;
  v_opening numeric;
  v_closing numeric;
  v_rank int;
begin
  if not is_admin() then
    raise exception 'Only admin can run the finance step';
  end if;
  if exists (select 1 from finance_log where matchweek = p_matchweek) then
    raise exception 'Matchweek % has already been financially settled', p_matchweek;
  end if;

  for v_club in select * from clubs loop
    v_opening := v_club.cash;

    select coalesce(sum(s.matchday_revenue), 0) into v_stadium_revenue
      from fixtures f join stadiums s on s.id = v_club.stadium_id
      where f.matchweek = p_matchweek and f.home_club_id = v_club.id and f.played = true;

    select coalesce(maintenance, 0) into v_maintenance from stadiums where id = v_club.stadium_id;
    v_maintenance := coalesce(v_maintenance, 0);

    v_prize := 0;
    if p_matchweek = 10 then
      select ranked.rank into v_rank from (
        select id, rank() over (order by points desc, (gf - ga) desc, gf desc) as rank
        from clubs
      ) ranked where ranked.id = v_club.id;

      -- Default season-end prize schedule (Rs millions) — tune here if the
      -- organizer wants a different payout, no other code depends on it.
      v_prize := case v_rank when 1 then 40 when 2 then 25 when 3 then 15 else 0 end;
    end if;

    select coalesce(sum(case
        when buyer_club_id = v_club.id then -amount
        when seller_club_id = v_club.id then amount
        else 0 end), 0) into v_transfers_delta
      from transfers
      where matchweek = p_matchweek and (buyer_club_id = v_club.id or seller_club_id = v_club.id);

    v_closing := v_opening + v_stadium_revenue + v_prize - v_maintenance + v_transfers_delta;

    update clubs set cash = v_closing where id = v_club.id;

    insert into finance_log (
      matchweek, club_id, opening_cash, stadium_revenue, prize_money,
      maintenance, transfers_delta, other, closing_cash
    ) values (
      p_matchweek, v_club.id, v_opening, v_stadium_revenue, v_prize,
      v_maintenance, v_transfers_delta, 0, v_closing
    );
  end loop;
end;
$$;
grant execute on function apply_finance_matchweek(int) to authenticated;

-- ------------------------------------------------------------
-- LLM SETTINGS (Supabase Vault backed)
-- get_llm_credentials() is intentionally callable only by
-- service_role: it decrypts the API key and must only ever be
-- invoked from trusted server code (the /api/simulate-match
-- route using SUPABASE_SERVICE_ROLE_KEY), never from a browser
-- session, admin or otherwise.
-- ------------------------------------------------------------
create or replace function set_llm_settings(p_provider text, p_model text, p_base_url text, p_api_key text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_existing_secret_id uuid;
  v_new_secret_id uuid;
begin
  if not is_admin() then
    raise exception 'Only admin can configure the simulation provider';
  end if;
  if p_provider not in ('openai', 'anthropic', 'custom') then
    raise exception 'Unknown provider %', p_provider;
  end if;

  select llm_api_key_secret_id into v_existing_secret_id from app_settings where id = true;

  if p_api_key is not null and length(p_api_key) > 0 then
    if v_existing_secret_id is not null then
      perform vault.update_secret(v_existing_secret_id, p_api_key);
      v_new_secret_id := v_existing_secret_id;
    else
      v_new_secret_id := vault.create_secret(
        p_api_key, 'moneyball_llm_api_key', 'Moneyball Alpha match-simulation LLM API key'
      );
    end if;
  else
    v_new_secret_id := v_existing_secret_id;
  end if;

  update app_settings set
    llm_provider = p_provider,
    llm_model = p_model,
    llm_base_url = p_base_url,
    llm_api_key_secret_id = v_new_secret_id,
    updated_by = auth.uid()
  where id = true;
end;
$$;
grant execute on function set_llm_settings(text, text, text, text) to authenticated;

create or replace function get_llm_settings_public()
returns table(llm_provider text, llm_model text, llm_base_url text, has_api_key boolean)
language plpgsql
stable
security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Only admin can view simulation settings';
  end if;
  return query
    select a.llm_provider, a.llm_model, a.llm_base_url, (a.llm_api_key_secret_id is not null)
    from app_settings a where a.id = true;
end;
$$;
grant execute on function get_llm_settings_public() to authenticated;

create or replace function get_llm_credentials()
returns table(llm_provider text, llm_model text, llm_base_url text, api_key text)
language sql
stable
security definer set search_path = public
as $$
  select a.llm_provider, a.llm_model, a.llm_base_url, vs.decrypted_secret
  from app_settings a
  left join vault.decrypted_secrets vs on vs.id = a.llm_api_key_secret_id
  where a.id = true;
$$;
revoke all on function get_llm_credentials() from public;
grant execute on function get_llm_credentials() to service_role;

-- ------------------------------------------------------------
-- Lock down default PUBLIC execute rights picked up at CREATE
-- FUNCTION time. Explicit grants above to `authenticated` /
-- `service_role` remain unaffected by this.
-- ------------------------------------------------------------
revoke execute on all functions in schema public from public;
