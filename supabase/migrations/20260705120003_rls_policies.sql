-- ============================================================
-- MONEYBALL ALPHA — ROW LEVEL SECURITY
-- ------------------------------------------------------------
-- Design: club owners get broad read access (the league is
-- transparent to every participant) but almost no direct write
-- access. The few writes a club owner is allowed to make
-- (bidding, submitting a lineup, registering a club name) go
-- through SECURITY DEFINER RPC functions (see the functions
-- migration) that validate ownership, budget, and game-state
-- invariants that RLS predicates alone can't express. Direct
-- table writes are otherwise restricted to the admin role.
-- Service-role calls (used by the simulate-match server route)
-- bypass RLS entirely, which is expected and safe because that
-- route never accepts arbitrary client input for the columns it
-- writes.
-- ============================================================

create or replace function is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()) = 'admin', false);
$$;

create or replace function current_club_id()
returns uuid
language sql
stable
security definer set search_path = public
as $$
  select club_id from public.profiles where id = auth.uid();
$$;

grant execute on function is_admin() to authenticated;
grant execute on function current_club_id() to authenticated;

alter table clubs enable row level security;
alter table stadiums enable row level security;
alter table managers enable row level security;
alter table players enable row level security;
alter table fixtures enable row level security;
alter table lineups enable row level security;
alter table match_events enable row level security;
alter table commentary_lines enable row level security;
alter table finance_log enable row level security;
alter table awards enable row level security;
alter table season_state enable row level security;
alter table profiles enable row level security;
alter table auction_lots enable row level security;
alter table auction_bids enable row level security;
alter table auction_state enable row level security;
alter table app_settings enable row level security;
alter table simulation_logs enable row level security;

-- ------------------------------------------------------------
-- Read-mostly league data: every authenticated participant can
-- see everything (matchday-programme transparency), only admin
-- writes directly.
-- ------------------------------------------------------------
create policy clubs_select on clubs for select to authenticated using (true);
create policy clubs_admin_write on clubs for all to authenticated using (is_admin()) with check (is_admin());

create policy stadiums_select on stadiums for select to authenticated using (true);
create policy stadiums_admin_write on stadiums for all to authenticated using (is_admin()) with check (is_admin());

create policy managers_select on managers for select to authenticated using (true);
create policy managers_admin_write on managers for all to authenticated using (is_admin()) with check (is_admin());

create policy players_select on players for select to authenticated using (true);
create policy players_admin_write on players for all to authenticated using (is_admin()) with check (is_admin());

create policy fixtures_select on fixtures for select to authenticated using (true);
create policy fixtures_admin_write on fixtures for all to authenticated using (is_admin()) with check (is_admin());

create policy lineups_select on lineups for select to authenticated using (true);
create policy lineups_admin_write on lineups for all to authenticated using (is_admin()) with check (is_admin());

create policy match_events_select on match_events for select to authenticated using (true);
create policy match_events_admin_write on match_events for all to authenticated using (is_admin()) with check (is_admin());

create policy commentary_lines_select on commentary_lines for select to authenticated using (true);
create policy commentary_lines_admin_write on commentary_lines for all to authenticated using (is_admin()) with check (is_admin());

create policy finance_log_select on finance_log for select to authenticated using (true);
create policy finance_log_admin_write on finance_log for all to authenticated using (is_admin()) with check (is_admin());

create policy awards_select on awards for select to authenticated using (true);
create policy awards_admin_write on awards for all to authenticated using (is_admin()) with check (is_admin());

create policy season_state_select on season_state for select to authenticated using (true);
create policy season_state_admin_write on season_state for all to authenticated using (is_admin()) with check (is_admin());

create policy auction_lots_select on auction_lots for select to authenticated using (true);
create policy auction_lots_admin_write on auction_lots for all to authenticated using (is_admin()) with check (is_admin());

create policy auction_bids_select on auction_bids for select to authenticated using (true);
create policy auction_bids_admin_write on auction_bids for all to authenticated using (is_admin()) with check (is_admin());
-- No insert policy for plain authenticated users: bids must go through place_bid().

create policy auction_state_select on auction_state for select to authenticated using (true);
create policy auction_state_admin_write on auction_state for all to authenticated using (is_admin()) with check (is_admin());

-- ------------------------------------------------------------
-- PROFILES: a user can read their own profile; admin reads/writes all.
-- ------------------------------------------------------------
create policy profiles_select_own_or_admin on profiles for select to authenticated
  using (id = auth.uid() or is_admin());
create policy profiles_admin_write on profiles for all to authenticated
  using (is_admin()) with check (is_admin());

-- ------------------------------------------------------------
-- APP_SETTINGS / SIMULATION_LOGS: admin only, end to end. Club
-- owners have no business need to see provider config or raw
-- LLM prompts/responses.
-- ------------------------------------------------------------
create policy app_settings_admin_only on app_settings for all to authenticated
  using (is_admin()) with check (is_admin());

create policy simulation_logs_admin_only on simulation_logs for all to authenticated
  using (is_admin()) with check (is_admin());
