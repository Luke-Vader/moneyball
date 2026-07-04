'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function LockControl({ fixtureId, lockAt }: { fixtureId: string; lockAt: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const locked = lockAt ? new Date(lockAt) < new Date() : false;

  async function lockNow() {
    setBusy(true);
    const supabase = createClient();
    await supabase.from('fixtures').update({ lineup_lock_at: new Date().toISOString() }).eq('id', fixtureId);
    setBusy(false);
    router.refresh();
  }

  async function unlock() {
    setBusy(true);
    const supabase = createClient();
    await supabase.from('fixtures').update({ lineup_lock_at: null }).eq('id', fixtureId);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3 border border-chalk-dim/30 bg-pitch-light p-4">
      <p className="text-sm text-chalk-dim">
        Lineups are {locked ? <span className="text-danger">locked</span> : <span className="text-success">open</span>}
      </p>
      <button
        disabled={busy}
        onClick={locked ? unlock : lockNow}
        className="ml-auto border border-gold px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gold hover:bg-gold hover:text-pitch-dark disabled:opacity-50"
      >
        {locked ? 'Unlock' : 'Lock Now'}
      </button>
    </div>
  );
}
