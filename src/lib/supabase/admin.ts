import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Service-role client: bypasses RLS entirely. Only ever use this from
// trusted server code that does not forward arbitrary client input into the
// columns it writes (the /api/simulate-match route, the LLM credential
// lookup). The `server-only` import makes any accidental client-bundle
// inclusion a build-time error rather than a leaked secret.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
