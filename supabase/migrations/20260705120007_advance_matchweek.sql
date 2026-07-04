-- ============================================================
-- MONEYBALL ALPHA — ADVANCE MATCHWEEK
-- Suspensions are always a one-matchweek ban, so moving to the
-- next matchweek is what lifts them. Injuries carry an explicit
-- injury_return_matchweek set by the simulation
-- (src/lib/simulation/player-updates.ts) and clear once that
-- matchweek arrives.
-- ============================================================
create or replace function advance_matchweek()
returns season_state
language plpgsql
security definer set search_path = public
as $$
declare
  v_state season_state;
  v_new_mw int;
begin
  if not is_admin() then
    raise exception 'Only admin can advance the matchweek';
  end if;

  select * into v_state from season_state where id = true for update;
  v_new_mw := least(10, v_state.current_matchweek + 1);

  update players set suspended = false where suspended = true;
  update players set injured = false, injury_return_matchweek = null
    where injured = true and injury_return_matchweek is not null and injury_return_matchweek <= v_new_mw;

  update season_state set current_matchweek = v_new_mw where id = true
    returning * into v_state;

  return v_state;
end;
$$;

grant execute on function advance_matchweek() to authenticated;
revoke execute on function advance_matchweek() from public;
