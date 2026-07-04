'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface ClubOption {
  id: string;
  name: string;
}

export function AdminFinanceControls({
  currentMatchweek,
  clubs,
  alreadySettled,
}: {
  currentMatchweek: number;
  clubs: ClubOption[];
  alreadySettled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const isTransferWindow = currentMatchweek === 4 || currentMatchweek === 7;
  const [buyerId, setBuyerId] = useState(clubs[0]?.id ?? '');
  const [sellerId, setSellerId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  async function runFinance() {
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.rpc('apply_finance_matchweek', { p_matchweek: currentMatchweek });
    setBusy(false);
    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }
    setMessage({ type: 'success', text: `Matchweek ${currentMatchweek} settled.` });
    router.refresh();
  }

  async function recordTransfer(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.rpc('record_transfer', {
      p_matchweek: currentMatchweek as 4 | 7,
      p_buyer_club_id: buyerId,
      p_seller_club_id: sellerId || null,
      p_player_id: null,
      p_amount: Number(amount),
      p_note: note || null,
    });
    setBusy(false);
    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }
    setAmount('');
    setNote('');
    setMessage({ type: 'success', text: 'Transfer recorded.' });
    router.refresh();
  }

  return (
    <section className="space-y-4 border border-gold/30 bg-pitch-light p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gold">Matchweek {currentMatchweek} Settlement</p>
          <p className="mt-1 text-sm text-chalk-dim">
            Runs stadium revenue, maintenance, prize money (MW10 only), and transfers for every club.
          </p>
        </div>
        <button
          onClick={runFinance}
          disabled={busy || alreadySettled}
          className="bg-gold px-4 py-2 text-sm font-semibold uppercase tracking-wide text-pitch-dark hover:bg-gold-dim disabled:opacity-50"
        >
          {alreadySettled ? 'Already Settled' : 'Run Finance'}
        </button>
      </div>

      {isTransferWindow && (
        <form onSubmit={recordTransfer} className="grid gap-3 border-t border-chalk-dim/20 pt-4 sm:grid-cols-4">
          <div className="sm:col-span-4">
            <p className="text-xs uppercase tracking-wide text-chalk-dim">Transfer Window Open (MW{currentMatchweek})</p>
          </div>
          <select
            value={buyerId}
            onChange={(e) => setBuyerId(e.target.value)}
            className="border border-chalk-dim/40 bg-pitch px-2 py-2 text-sm text-chalk outline-none focus:border-gold"
          >
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                Buyer: {c.name}
              </option>
            ))}
          </select>
          <select
            value={sellerId}
            onChange={(e) => setSellerId(e.target.value)}
            className="border border-chalk-dim/40 bg-pitch px-2 py-2 text-sm text-chalk outline-none focus:border-gold"
          >
            <option value="">Seller: none (external)</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                Seller: {c.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.5"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount (₹M)"
            className="border border-chalk-dim/40 bg-pitch px-2 py-2 text-sm text-chalk outline-none focus:border-gold"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="border border-chalk-dim/40 bg-pitch px-2 py-2 text-sm text-chalk outline-none focus:border-gold"
          />
          <button
            type="submit"
            disabled={busy}
            className="border border-gold px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gold hover:bg-gold hover:text-pitch-dark disabled:opacity-50 sm:col-span-4"
          >
            Record Transfer
          </button>
        </form>
      )}

      {message && (
        <p className={`text-sm ${message.type === 'error' ? 'text-danger' : 'text-success'}`}>{message.text}</p>
      )}
    </section>
  );
}
