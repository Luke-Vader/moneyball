'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { SeasonPhase } from '@/lib/supabase/database.types';

const PHASES: SeasonPhase[] = ['registration', 'auction', 'squad_submission', 'season', 'completed'];

export function PhaseControl({
  currentPhase,
  currentMatchweek,
}: {
  currentPhase: SeasonPhase;
  currentMatchweek: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const phaseIndex = PHASES.indexOf(currentPhase);
  const nextPhase = PHASES[phaseIndex + 1];

  async function advancePhase() {
    if (!nextPhase) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.from('season_state').update({ phase: nextPhase }).eq('id', true);
    setBusy(false);
    router.refresh();
  }

  async function advanceMatchweek() {
    setBusy(true);
    const supabase = createClient();
    await supabase.rpc('advance_matchweek');
    setBusy(false);
    router.refresh();
  }

  async function rewindMatchweek() {
    setBusy(true);
    const supabase = createClient();
    const value = Math.max(1, currentMatchweek - 1);
    await supabase.from('season_state').update({ current_matchweek: value }).eq('id', true);
    setBusy(false);
    router.refresh();
  }

  return (
    <section className="flex flex-wrap items-center gap-4 border border-gold/30 bg-pitch-light p-5">
      <div>
        <p className="text-xs uppercase tracking-wide text-chalk-dim">Advance the event</p>
        <p className="mt-1 text-sm text-chalk-dim">
          Current matchweek: <span className="font-stats text-chalk">{currentMatchweek}</span>
        </p>
      </div>
      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={rewindMatchweek}
          className="border border-chalk-dim/40 px-3 py-1.5 text-sm text-chalk hover:border-gold disabled:opacity-50"
        >
          MW −1
        </button>
        <button
          disabled={busy}
          onClick={advanceMatchweek}
          title="Also lifts suspensions and clears expired injuries"
          className="border border-chalk-dim/40 px-3 py-1.5 text-sm text-chalk hover:border-gold disabled:opacity-50"
        >
          MW +1
        </button>
      </div>
      {nextPhase && (
        <button
          disabled={busy}
          onClick={advancePhase}
          className="ml-auto bg-gold px-4 py-2 text-sm font-semibold uppercase tracking-wide text-pitch-dark hover:bg-gold-dim disabled:opacity-60"
        >
          Advance to {nextPhase.replace('_', ' ')}
        </button>
      )}
    </section>
  );
}
