-- ============================================================
-- MONEYBALL ALPHA — RESET EVENT DATA
-- Wipes all game/event data back to a fresh pre-registration
-- state, for reuse across multiple live events. Deliberately
-- leaves app_settings (LLM provider config) untouched — that's
-- organizer infrastructure, not event data. Deleting club-owner
-- auth accounts is handled separately in the /api/admin/reset-event
-- route (via the Admin API, not raw SQL) — this function only
-- resets tables, it does not touch auth.users.
-- ============================================================
create or replace function reset_event_data()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Only admin can reset event data';
  end if;

  -- Delete in FK-safe order: commentary_lines references match_events.
  delete from commentary_lines;
  delete from match_events;
  delete from player_match_stats;
  delete from simulation_logs;
  delete from finance_log;
  delete from transfers;
  delete from auction_bids;
  delete from lineups;
  delete from awards;

  update auction_lots set
    status = 'pending', winning_club_id = null, final_price = null, started_at = null, ended_at = null;
  update auction_state set current_lot_id = null, is_open = false where id = true;

  update fixtures set
    played = false, home_goals = null, away_goals = null, stats_applied = false,
    motm_player_id = null, possession = null, shots = null, sot = null, corners = null, cards = null,
    lineup_lock_at = null;

  update stadiums set owner_club_id = null, sold = false;
  update managers set owner_club_id = null, sold = false;
  update players set
    owner_club_id = null, sold = false, fitness = 100, morale = 75, yellow_cards = 0, red_cards = 0,
    suspended = false, injured = false, injury_return_matchweek = null,
    appearances = 0, minutes_played = 0, goals = 0, assists = 0, rating_sum = 0;

  update clubs set
    name = case id
      when '00000000-0000-0000-0000-000000000001' then 'Club 1'
      when '00000000-0000-0000-0000-000000000002' then 'Club 2'
      when '00000000-0000-0000-0000-000000000003' then 'Club 3'
      when '00000000-0000-0000-0000-000000000004' then 'Club 4'
      when '00000000-0000-0000-0000-000000000005' then 'Club 5'
      when '00000000-0000-0000-0000-000000000006' then 'Club 6'
      else name
    end,
    owner_name = null,
    budget = 250, cash = 250, loan = 0,
    formation = null, tactical_style = null, defensive_line = null, tempo = null, match_instructions = null,
    played = 0, won = 0, drawn = 0, lost = 0, gf = 0, ga = 0, points = 0,
    biggest_win = null, biggest_loss = null, win_streak = 0,
    stadium_id = null, manager_id = null, captain_id = null;

  update season_state set phase = 'registration', current_matchweek = 1 where id = true;

  -- Any lingering club_id on a surviving (admin) profile is stale once every
  -- club has been un-owned above.
  update profiles set club_id = null where role = 'admin';
end;
$$;

grant execute on function reset_event_data() to authenticated;
revoke execute on function reset_event_data() from public;
