-- ============================================================
-- FIX: this project rejects bare DELETE FROM table with no WHERE
-- clause ("DELETE requires a WHERE clause"), confirmed via live
-- testing. Add a trivial `where true` to every full-table delete
-- in reset_event_data() — identical behavior, satisfies the guard.
-- ============================================================
create or replace function reset_event_data()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not (is_admin() or auth.role() = 'service_role') then
    raise exception 'Only admin can reset event data';
  end if;

  delete from commentary_lines where true;
  delete from match_events where true;
  delete from player_match_stats where true;
  delete from simulation_logs where true;
  delete from finance_log where true;
  delete from transfers where true;
  delete from auction_bids where true;
  delete from lineups where true;
  delete from awards where true;

  update auction_lots set
    status = 'pending', winning_club_id = null, final_price = null, started_at = null, ended_at = null
  where true;
  update auction_state set current_lot_id = null, is_open = false where id = true;

  update fixtures set
    played = false, home_goals = null, away_goals = null, stats_applied = false,
    motm_player_id = null, possession = null, shots = null, sot = null, corners = null, cards = null,
    lineup_lock_at = null
  where true;

  update stadiums set owner_club_id = null, sold = false where true;
  update managers set owner_club_id = null, sold = false where true;
  update players set
    owner_club_id = null, sold = false, fitness = 100, morale = 75, yellow_cards = 0, red_cards = 0,
    suspended = false, injured = false, injury_return_matchweek = null,
    appearances = 0, minutes_played = 0, goals = 0, assists = 0, rating_sum = 0
  where true;

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
    stadium_id = null, manager_id = null, captain_id = null
  where true;

  update season_state set phase = 'registration', current_matchweek = 1 where id = true;

  update profiles set club_id = null where role = 'admin';
end;
$$;
