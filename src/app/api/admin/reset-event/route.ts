import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Destructive: deletes every club_owner account (Admin API — cascades to
// their profile row via FK), then wipes all game/event data via
// reset_event_data(). Deliberately preserves the calling admin's own
// account/session and the LLM provider settings in app_settings.
export async function POST() {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: profile } = await userClient.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Only the commissioner can reset the event' }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: clubOwners, error: fetchError } = await admin.from('profiles').select('id').eq('role', 'club_owner');
  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const deletionErrors: string[] = [];
  for (const owner of clubOwners ?? []) {
    const { error } = await admin.auth.admin.deleteUser(owner.id);
    if (error) deletionErrors.push(`${owner.id}: ${error.message}`);
  }

  const { error: resetError } = await admin.rpc('reset_event_data');
  if (resetError) {
    return NextResponse.json({ error: resetError.message, deletionErrors }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    deletedAccounts: (clubOwners?.length ?? 0) - deletionErrors.length,
    deletionErrors,
  });
}
