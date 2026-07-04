import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth';

export default async function HomePage() {
  const profile = await getCurrentProfile();

  if (profile) {
    if (profile.role === 'admin') redirect('/admin');
    if (!profile.club_id) redirect('/register');
    redirect('/club');
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <p className="font-stats text-xs uppercase tracking-[0.4em] text-gold">Six clubs. One matchday.</p>
      <h1 className="mt-4 font-display text-5xl uppercase text-chalk sm:text-6xl">Moneyball Alpha</h1>
      <p className="mt-4 max-w-lg text-chalk-dim">
        Register your club, bid for stadiums, managers and players, set your tactics, and let the league play out —
        live.
      </p>
      <Link
        href="/login"
        className="mt-8 border border-gold px-6 py-3 font-semibold uppercase tracking-wide text-gold transition hover:bg-gold hover:text-pitch-dark"
      >
        Manager Sign-In
      </Link>
    </main>
  );
}
