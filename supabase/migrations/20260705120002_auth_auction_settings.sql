-- ============================================================
-- MONEYBALL ALPHA — AUTH ROLES, AUCTION, SETTINGS / VAULT
-- ============================================================

-- ------------------------------------------------------------
-- PROFILES — links a Supabase auth user to a role and (for club
-- owners) a club. Created automatically on signup via trigger
-- below; admin promotes/assigns club_id afterward.
-- ------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'club_owner' check (role in ('admin','club_owner')),
  club_id uuid references clubs(id),
  created_at timestamptz not null default now()
);

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ------------------------------------------------------------
-- AUCTION
-- ------------------------------------------------------------
create table auction_lots (
  id uuid primary key default gen_random_uuid(),
  lot_order int not null unique,
  item_type text not null check (item_type in ('stadium','manager','player')),
  item_id uuid not null,
  status text not null default 'pending' check (status in ('pending','live','sold','unsold')),
  winning_club_id uuid references clubs(id),
  final_price numeric(12,2),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table auction_bids (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references auction_lots(id),
  club_id uuid not null references clubs(id),
  amount numeric(12,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create index auction_bids_lot_idx on auction_bids(lot_id);

-- Single-row table: id is always `true`, so only one row can ever exist.
create table auction_state (
  id boolean primary key default true check (id),
  current_lot_id uuid references auction_lots(id),
  is_open boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger auction_state_set_updated_at
  before update on auction_state
  for each row execute function set_updated_at();

insert into auction_state (id) values (true);

-- ------------------------------------------------------------
-- APP_SETTINGS — LLM provider config for match simulation.
-- The API key itself is never stored here: only a pointer
-- (llm_api_key_secret_id) into Supabase Vault (vault.secrets).
-- Only server-side code using the service_role key may read the
-- decrypted secret (see get_llm_credentials() in functions
-- migration) — it is never exposed to any authenticated client,
-- including admins, through the API.
-- ------------------------------------------------------------
create extension if not exists supabase_vault cascade;

create table app_settings (
  id boolean primary key default true check (id),
  llm_provider text check (llm_provider in ('openai','anthropic','custom')),
  llm_model text,
  llm_base_url text,
  llm_api_key_secret_id uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

create trigger app_settings_set_updated_at
  before update on app_settings
  for each row execute function set_updated_at();

insert into app_settings (id) values (true);

-- ------------------------------------------------------------
-- SIMULATION_LOGS — full audit trail of every LLM call made to
-- simulate a match, so a contested result can be replayed.
-- ------------------------------------------------------------
create table simulation_logs (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references fixtures(id),
  attempt int not null default 1,
  provider text,
  model text,
  request_payload jsonb,
  raw_response text,
  validation_errors jsonb,
  success boolean not null default false,
  created_at timestamptz not null default now()
);

create index simulation_logs_fixture_idx on simulation_logs(fixture_id);
