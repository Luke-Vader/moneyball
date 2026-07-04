'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setStatus('error');
      setError(error.message);
      return;
    }
    setStatus('sent');
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm border border-gold/30 bg-pitch-light p-8">
        <p className="font-stats text-xs uppercase tracking-[0.3em] text-gold">Moneyball Alpha</p>
        <h1 className="mt-2 font-display text-3xl uppercase text-chalk">Manager Sign-In</h1>
        <p className="mt-2 text-sm text-chalk-dim">
          Enter the email your club owner account was registered with. We&apos;ll send a magic link — no password.
        </p>

        {status === 'sent' ? (
          <div className="mt-6 border border-success/40 bg-success/10 p-4 text-sm text-chalk">
            Check <span className="font-semibold">{email}</span> for a sign-in link.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-xs uppercase tracking-wide text-chalk-dim">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-chalk-dim/40 bg-pitch px-3 py-2 text-chalk outline-none focus:border-gold"
                placeholder="owner@club.com"
              />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full bg-gold px-4 py-2 font-semibold uppercase tracking-wide text-pitch-dark transition hover:bg-gold-dim disabled:opacity-60"
            >
              {status === 'sending' ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
