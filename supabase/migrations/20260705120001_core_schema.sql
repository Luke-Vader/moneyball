-- ============================================================
-- MONEYBALL ALPHA — CORE SCHEMA
-- ------------------------------------------------------------
-- Currency convention: every monetary column is numeric,
-- denominated in RUPEES-MILLIONS. e.g. clubs.budget = 250 means
-- a budget of Rs 250,000,000. This matches the scale of the
-- seed data (stadium base prices ~36-65, player base prices
-- ~4-48) against a 250-unit club budget.
-- ============================================================

create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- CLUBS (base columns only — stadium_id/manager_id/captain_id
-- are added after stadiums/managers/players exist, to break the
-- circular FK dependency).
-- ------------------------------------------------------------
create table clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  owner_name text,
  budget numeric(12,2) not null default 250,
  cash numeric(12,2) not null default 250,
  loan numeric(12,2) not null default 0,
  formation text check (formation in ('4-3-3','4-4-2','4-2-3-1','3-5-2','3-4-3')),
  tactical_style text,
  defensive_line text check (defensive_line in ('High','Medium','Low')),
  tempo text check (tempo in ('Fast','Balanced','Slow')),
  match_instructions text,
  played int not null default 0,
  won int not null default 0,
  drawn int not null default 0,
  lost int not null default 0,
  gf int not null default 0,
  ga int not null default 0,
  points int not null default 0,
  biggest_win jsonb,
  biggest_loss jsonb,
  win_streak int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger clubs_set_updated_at
  before update on clubs
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- STADIUMS
-- ------------------------------------------------------------
create table stadiums (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null check (category in (
    'Commercial Powerhouse','Fortress','Elite Facilities','Atmosphere','Football Heritage'
  )),
  base_price numeric(12,2) not null,
  matchday_revenue numeric(12,2) not null,
  maintenance numeric(12,2) not null,
  home_advantage_stars numeric(3,1) not null,
  passive_ability text not null,
  owner_club_id uuid references clubs(id),
  sold boolean not null default false,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- MANAGERS
-- ------------------------------------------------------------
create table managers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  style text not null check (style in (
    'Possession','Gegenpress','Park the Bus','Counter-attack','Wing Play'
  )),
  base_price numeric(12,2) not null,
  special_ability text not null,
  owner_club_id uuid references clubs(id),
  sold boolean not null default false,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- PLAYERS
-- real_club = real-world club (flavor text only, no gameplay link
-- to the fantasy `clubs` table besides the Chemistry Engine).
-- ------------------------------------------------------------
create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position text not null check (position in ('GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST')),
  real_club text not null,
  nationality text not null,
  overall int not null check (overall between 1 and 99),
  pace int not null check (pace between 1 and 99),
  shooting int not null check (shooting between 1 and 99),
  passing int not null check (passing between 1 and 99),
  dribbling int not null check (dribbling between 1 and 99),
  defending int not null check (defending between 1 and 99),
  physical int not null check (physical between 1 and 99),
  base_price numeric(12,2) not null,
  tier text not null check (tier in (
    'Elite Goalkeepers','Elite Defenders','Elite Midfielders','Elite Attackers','Wonderkids / Bargains'
  )),
  owner_club_id uuid references clubs(id),
  sold boolean not null default false,
  fitness numeric(5,2) not null default 100 check (fitness between 0 and 100),
  morale numeric(5,2) not null default 75 check (morale between 0 and 100),
  yellow_cards int not null default 0,
  red_cards int not null default 0,
  suspended boolean not null default false,
  injured boolean not null default false,
  injury_return_matchweek int,
  chemistry_group text,
  appearances int not null default 0,
  minutes_played int not null default 0,
  goals int not null default 0,
  assists int not null default 0,
  rating_sum numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger players_set_updated_at
  before update on players
  for each row execute function set_updated_at();

-- Now that stadiums/managers/players exist, close the loop on clubs.
alter table clubs
  add column stadium_id uuid references stadiums(id),
  add column manager_id uuid references managers(id),
  add column captain_id uuid references players(id);

-- ------------------------------------------------------------
-- FIXTURES
-- ------------------------------------------------------------
create table fixtures (
  id uuid primary key default gen_random_uuid(),
  matchweek int not null check (matchweek between 1 and 10),
  home_club_id uuid not null references clubs(id),
  away_club_id uuid not null references clubs(id),
  played boolean not null default false,
  home_goals int,
  away_goals int,
  stats_applied boolean not null default false,
  motm_player_id uuid references players(id),
  possession jsonb,
  shots jsonb,
  sot jsonb,
  corners jsonb,
  cards jsonb,
  lineup_lock_at timestamptz,
  created_at timestamptz not null default now(),
  constraint fixtures_distinct_clubs check (home_club_id <> away_club_id)
);

create index fixtures_matchweek_idx on fixtures(matchweek);

-- ------------------------------------------------------------
-- LINEUPS
-- fixture_id null = the club's standing "default lineup" used as
-- a fallback/template. Exactly one default lineup per club, and
-- at most one lineup per (club, fixture).
-- ------------------------------------------------------------
create table lineups (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id),
  fixture_id uuid references fixtures(id),
  starting_xi uuid[] not null,
  bench uuid[] not null default '{}',
  formation text not null check (formation in ('4-3-3','4-4-2','4-2-3-1','3-5-2','3-4-3')),
  style text,
  defensive_line text check (defensive_line in ('High','Medium','Low')),
  tempo text check (tempo in ('Fast','Balanced','Slow')),
  captain_id uuid references players(id),
  instructions text,
  locked boolean not null default false,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint lineups_xi_size check (array_length(starting_xi, 1) = 11),
  constraint lineups_bench_size check (bench is null or array_length(bench, 1) <= 5)
);

create unique index lineups_default_unique on lineups(club_id) where fixture_id is null;
create unique index lineups_fixture_unique on lineups(club_id, fixture_id) where fixture_id is not null;

-- ------------------------------------------------------------
-- MATCH_EVENTS — ground truth timeline, written by the server
-- BEFORE any commentary is generated. Never written client-side.
-- ------------------------------------------------------------
create table match_events (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references fixtures(id),
  minute int not null check (minute between 0 and 120),
  type text not null check (type in ('goal','card','injury','substitution')),
  side text not null check (side in ('home','away')),
  player_id uuid references players(id),
  assist_player_id uuid references players(id),
  card_type text check (card_type in ('yellow','red')),
  detail text,
  created_at timestamptz not null default now()
);

create index match_events_fixture_idx on match_events(fixture_id);

-- ------------------------------------------------------------
-- COMMENTARY_LINES — read-only narration layer generated FROM
-- match_events. The check constraint is the hard DB-level
-- enforcement of "compute before narrate": any goal/card/injury
-- line must reference a real event row.
-- ------------------------------------------------------------
create table commentary_lines (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references fixtures(id),
  minute int not null check (minute between 0 and 120),
  text text not null,
  type text not null check (type in (
    'kickoff','filler','goal','card','injury','substitution','halftime','fulltime'
  )),
  ref_event_id uuid references match_events(id),
  created_at timestamptz not null default now(),
  constraint commentary_needs_event check (
    type not in ('goal','card','injury') or ref_event_id is not null
  )
);

create index commentary_lines_fixture_idx on commentary_lines(fixture_id);

-- ------------------------------------------------------------
-- FINANCE_LOG
-- ------------------------------------------------------------
create table finance_log (
  id uuid primary key default gen_random_uuid(),
  matchweek int not null,
  club_id uuid not null references clubs(id),
  opening_cash numeric(12,2) not null,
  stadium_revenue numeric(12,2) not null default 0,
  prize_money numeric(12,2) not null default 0,
  maintenance numeric(12,2) not null default 0,
  transfers_delta numeric(12,2) not null default 0,
  other numeric(12,2) not null default 0,
  closing_cash numeric(12,2) not null,
  created_at timestamptz not null default now(),
  unique (matchweek, club_id)
);

-- ------------------------------------------------------------
-- AWARDS
-- ------------------------------------------------------------
create table awards (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id),
  club_id uuid references clubs(id),
  goals int not null default 0,
  assists int not null default 0,
  clean_sheets int not null default 0,
  avg_rating numeric(5,2) not null default 0,
  season text not null default 'S1',
  created_at timestamptz not null default now(),
  unique (player_id, season)
);

-- ------------------------------------------------------------
-- SEASON_STATE — single row tracking overall event phase.
-- ------------------------------------------------------------
create table season_state (
  id boolean primary key default true check (id),
  phase text not null default 'registration' check (phase in (
    'registration','auction','squad_submission','season','completed'
  )),
  current_matchweek int not null default 1,
  updated_at timestamptz not null default now()
);

create trigger season_state_set_updated_at
  before update on season_state
  for each row execute function set_updated_at();

insert into season_state (id) values (true);
