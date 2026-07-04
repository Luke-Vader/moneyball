# Moneyball Alpha

A six-club football club-management league simulator for a live matchday event: registration → live auction → tactics/lineup submission → LLM-simulated matches → league table, team reports, and player progression.

Stack: Next.js 16 (App Router, TypeScript), Supabase (Postgres + Auth + Realtime), Tailwind v4.

## Currency convention

Every monetary column/value in the app (club budget, stadium/manager/player base prices, finance log) is a plain number denominated in **₹ millions**. A club's starting `budget` of `250` means ₹250,000,000. This matches the scale of the seed data (player prices ~4–48, stadium prices ~36–65 against a 250-unit budget).

## One-time setup

1. **Create a Supabase project** (or run `supabase start` locally with Docker for a fully local instance).
2. **Apply the schema**: the SQL lives in `supabase/migrations/*.sql`, applied in filename order. Either:
   - `supabase link --project-ref <ref>` then `supabase db push`, or
   - paste each migration file into the Supabase SQL Editor in order, or
   - for local dev, `supabase start` then `supabase db reset` (this also runs `supabase/seed.sql` automatically).
3. **Seed data**: `supabase/seed.sql` creates the 6 placeholder clubs, 10 stadiums, 5 managers, 35 players, all 30 fixtures, and the auction lot order. It runs automatically on `supabase db reset`; against a hosted project, run it manually once after the migrations.
4. **Enable Supabase Vault**: hosted Supabase projects have this on by default (Database → Vault). Local `supabase start` includes it too. The LLM API key is stored there, never in a plain column.
5. **Env vars**: copy `.env.local.example` to `.env.local` and fill in your project's URL/anon key/service role key (Settings → API in the dashboard, or `supabase status` locally).
6. **Bootstrap the first admin**: sign in once at `/login` with the organizer's email (this auto-creates a `profiles` row with `role = 'club_owner'`), then in the Supabase SQL Editor run:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
   There's no in-app way to self-promote to admin — that's intentional.
7. **Configure match simulation**: as admin, go to `/admin/settings` and set the LLM provider, model, and API key (OpenAI, Anthropic, or any OpenAI-compatible custom endpoint). Nothing can be simulated until this is set.

## Running

```bash
npm install
npm run dev       # dev server
npm run test      # vitest unit suite (simulation validation, player-update deltas, name resolution, team insights)
npm run build     # production build / typecheck
```

## Event flow

1. **Registration** (`/register`, admin: `/admin/registrations`) — club owners claim one of the 6 pre-seeded club slots; admin links each login to its club.
2. **Auction** (`/auction`, admin: `/admin/auction`) — live, Realtime-synced. Lot order is Stadiums → Managers → Elite GKs → Elite Defenders → Elite Midfielders → Elite Attackers → Wonderkids/Bargains. All bid validation and budget checks happen in Postgres (`place_bid`, `confirm_sale` in `supabase/migrations/..._functions.sql`), not the client.
3. **Squad submission** (`/club/lineup`) — formation/tactics/XI/bench, validated server-side against the owned roster and formation requirements (`submit_lineup`).
4. **Simulation** (admin: `/admin/fixtures/[id]` → Simulate Match) — calls `/api/simulate-match`, which builds full match context, sends it to the configured LLM, validates the response (schema, player-name resolution, and the "compute before narrate" rule that every goal/card/injury commentary line must reference a real event), retries once on failure, and commits everything atomically via `commit_match_result`.
5. **Match Centre** (`/match/[fixtureId]`) — pre-match strength comparison (no winner predicted) before kickoff, progressive commentary playback with a silent half-time break and full-time summary after.
6. **Reporting** (`/league`, `/league/[clubId]`, `/league/players/[playerId]`) and **Finance** (`/finance`) — league table, team status/report with rule-based strengths/weaknesses/recommendations, player progression charts, and the matchweek finance ledger. Transfers are only allowed at matchweeks 4 and 7.

## Scope notes / deliberate simplifications

- Match simulation is fully delegated to an LLM (per the build spec) rather than a custom ratings engine — there is no deterministic formula to unit test, so the test suite instead covers the validation/retry contract (`src/lib/simulation/__tests__`).
- Per-player match minutes/appearances/ratings are only credited to the starting XI. The LLM event schema doesn't identify which substitute replaced whom, so bench players who "came on" aren't distinguished from those who didn't — they get a fitness recovery bump but no appearance credit.
- Suspensions are always a flat one-matchweek ban (either immediate on a red card, or on every 3rd accumulated yellow) and clear automatically when the admin advances the matchweek (`advance_matchweek`), along with any injury whose `injury_return_matchweek` has arrived.
- Season-end prize money is a simple fixed schedule (1st ₹40M / 2nd ₹25M / 3rd ₹15M) in `apply_finance_matchweek` — easy to change in that one function if the organizer wants a different payout.
