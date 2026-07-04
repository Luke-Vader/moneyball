-- ============================================================
-- MONEYBALL ALPHA — REALTIME
-- Adds the tables the live auction room needs to stream via
-- Supabase Realtime (Postgres Changes). Everything else in the
-- app reads on page load / router.refresh() and doesn't need
-- streaming.
-- ============================================================

alter publication supabase_realtime add table auction_state;
alter publication supabase_realtime add table auction_bids;
alter publication supabase_realtime add table auction_lots;
alter publication supabase_realtime add table clubs;
