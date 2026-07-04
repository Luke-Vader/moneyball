'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function RegisterForm({ clubs }: { clubs: { id: string; name: string }[] }) {
  const router = useRouter();
  const [clubId, setClubId] = useState(clubs[0]?.id ?? '');
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc('register_club', {
      p_club_id: clubId,
      p_name: name,
      p_owner_name: ownerName,
    });
    if (error) {
      setStatus('error');
      setError(error.message);
      return;
    }
    setStatus('done');
    router.refresh();
  }

  if (clubs.length === 0 && status !== 'done') {
    return (
      <div className="mt-8 border border-gold/30 bg-pitch-light p-6 text-sm text-chalk-dim">
        All six club slots have been claimed. Ask the commissioner if you think this is a mistake.
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className="mt-8 border border-success/40 bg-success/10 p-6 text-sm text-chalk">
        <p className="font-semibold text-chalk">Club registered.</p>
        <p className="mt-2 text-chalk-dim">
          Ask the commissioner to activate your account — once linked, this page will send you straight to your club.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <div>
        <label className="mb-1 block text-xs uppercase tracking-wide text-chalk-dim">Available Slot</label>
        <select
          value={clubId}
          onChange={(e) => setClubId(e.target.value)}
          className="w-full border border-chalk-dim/40 bg-pitch px-3 py-2 text-chalk outline-none focus:border-gold"
        >
          {clubs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs uppercase tracking-wide text-chalk-dim">Club Name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Riverside United"
          className="w-full border border-chalk-dim/40 bg-pitch px-3 py-2 text-chalk outline-none focus:border-gold"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs uppercase tracking-wide text-chalk-dim">Owner Name</label>
        <input
          required
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          placeholder="Your name"
          className="w-full border border-chalk-dim/40 bg-pitch px-3 py-2 text-chalk outline-none focus:border-gold"
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={status === 'saving'}
        className="w-full bg-gold px-4 py-2 font-semibold uppercase tracking-wide text-pitch-dark transition hover:bg-gold-dim disabled:opacity-60"
      >
        {status === 'saving' ? 'Registering…' : 'Register Club'}
      </button>
    </form>
  );
}
