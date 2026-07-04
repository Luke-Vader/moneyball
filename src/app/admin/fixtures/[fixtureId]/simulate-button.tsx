'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SimulateButton({ fixtureId, ready }: { fixtureId: string; ready: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; details?: string[] } | null>(null);

  async function handleSimulate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/simulate-match', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fixtureId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError({ message: json.error ?? 'Simulation failed.', details: json.details });
        return;
      }
      router.refresh();
      router.push(`/match/${fixtureId}`);
    } catch {
      setError({ message: 'Simulation failed — check your network connection and try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleSimulate}
        disabled={busy || !ready}
        className="w-full bg-gold px-5 py-3 font-semibold uppercase tracking-wide text-pitch-dark hover:bg-gold-dim disabled:opacity-50"
      >
        {busy ? 'Simulating…' : ready ? 'Simulate Match' : 'Waiting on lineups'}
      </button>
      {error && (
        <div className="border border-danger/40 bg-danger/10 p-4 text-sm text-chalk">
          <p className="font-semibold text-danger">{error.message}</p>
          {error.details && (
            <ul className="mt-2 list-inside list-disc text-chalk-dim">
              {error.details.slice(0, 8).map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
