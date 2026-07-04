'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CONFIRM_PHRASE = 'RESET EVENT';

export function ResetForm() {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const canReset = confirmText === CONFIRM_PHRASE;

  async function handleReset() {
    if (!canReset) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/reset-event', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        setResult({ type: 'error', text: json.error ?? 'Reset failed.' });
        return;
      }
      setResult({
        type: 'success',
        text: `Done. ${json.deletedAccounts} club-owner account(s) removed. The event is back to a clean slate.`,
      });
      setConfirmText('');
      router.refresh();
    } catch {
      setResult({ type: 'error', text: 'Reset failed — check your network connection and try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 border border-danger/40 bg-pitch-light p-6">
      <label className="block text-xs uppercase tracking-wide text-chalk-dim">
        Type <span className="font-stats text-danger">{CONFIRM_PHRASE}</span> to confirm
      </label>
      <input
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder={CONFIRM_PHRASE}
        className="w-full border border-chalk-dim/40 bg-pitch px-3 py-2 font-stats text-chalk outline-none focus:border-danger"
      />
      <button
        onClick={handleReset}
        disabled={!canReset || busy}
        className="w-full bg-danger px-5 py-3 font-semibold uppercase tracking-wide text-chalk hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? 'Resetting…' : 'Reset Event — This Cannot Be Undone'}
      </button>
      {result && (
        <p className={`text-sm ${result.type === 'error' ? 'text-danger' : 'text-success'}`}>{result.text}</p>
      )}
    </div>
  );
}
