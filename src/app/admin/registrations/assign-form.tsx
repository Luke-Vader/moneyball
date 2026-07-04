'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function AssignForm({
  clubId,
  candidates,
}: {
  clubId: string;
  candidates: { id: string; email: string }[];
}) {
  const router = useRouter();
  const [profileId, setProfileId] = useState(candidates[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (candidates.length === 0) {
    return <span className="text-xs text-chalk-dim">Waiting for owner to sign in</span>;
  }

  async function handleAssign() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc('assign_club_owner', { p_profile_id: profileId, p_club_id: clubId });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={profileId}
        onChange={(e) => setProfileId(e.target.value)}
        className="border border-chalk-dim/40 bg-pitch px-2 py-1 text-sm text-chalk outline-none focus:border-gold"
      >
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>
            {c.email}
          </option>
        ))}
      </select>
      <button
        disabled={busy}
        onClick={handleAssign}
        className="bg-gold px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-pitch-dark hover:bg-gold-dim disabled:opacity-60"
      >
        Link
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
