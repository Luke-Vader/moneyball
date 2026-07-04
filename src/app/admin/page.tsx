import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PhaseControl } from './phase-control';

const PHASE_LABELS: Record<string, string> = {
  registration: 'Phase 1 — Registration',
  auction: 'Phase 2 — Auction',
  squad_submission: 'Phase 3 — Squad Submission',
  season: 'Season In Progress',
  completed: 'Season Complete',
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const [{ data: season }, { data: clubs }, { count: unclaimedCount }] = await Promise.all([
    supabase.from('season_state').select('*').single(),
    supabase.from('clubs').select('id, name, owner_name, budget'),
    supabase.from('clubs').select('id', { count: 'exact', head: true }).is('owner_name', null),
  ]);

  const registered = (clubs ?? []).filter((c) => c.owner_name).length;

  return (
    <div className="space-y-8">
      <div>
        <p className="font-stats text-xs uppercase tracking-[0.3em] text-gold">Commissioner Console</p>
        <h1 className="mt-2 font-display text-4xl uppercase text-chalk">Admin Dashboard</h1>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="border border-gold/30 bg-pitch-light p-5">
          <p className="text-xs uppercase tracking-wide text-chalk-dim">Season Phase</p>
          <p className="mt-1 font-display text-2xl text-chalk">{season ? PHASE_LABELS[season.phase] : '—'}</p>
        </div>
        <div className="border border-gold/30 bg-pitch-light p-5">
          <p className="text-xs uppercase tracking-wide text-chalk-dim">Clubs Registered</p>
          <p className="mt-1 font-display text-2xl text-chalk">{registered} / 6</p>
        </div>
        <div className="border border-gold/30 bg-pitch-light p-5">
          <p className="text-xs uppercase tracking-wide text-chalk-dim">Unclaimed Slots</p>
          <p className="mt-1 font-display text-2xl text-chalk">{unclaimedCount ?? 0}</p>
        </div>
      </section>

      {season && <PhaseControl currentPhase={season.phase} currentMatchweek={season.current_matchweek} />}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['/admin/registrations', 'Registrations', 'Link club-owner accounts to registered clubs'],
          ['/admin/auction', 'Auction Room', 'Run the live stadium/manager/player auction'],
          ['/admin/fixtures', 'Fixtures & Simulation', 'Lock lineups, simulate matches, run finance'],
          ['/admin/settings', 'Simulation Settings', 'Configure the LLM provider used to simulate matches'],
          ['/admin/history', 'Session History', 'Full audit log — every bid, sale, account, and simulated match'],
        ].map(([href, title, desc]) => (
          <Link
            key={href}
            href={href}
            className="border border-chalk-dim/30 bg-pitch-light p-5 transition hover:border-gold"
          >
            <p className="font-display text-lg uppercase text-chalk">{title}</p>
            <p className="mt-1 text-sm text-chalk-dim">{desc}</p>
          </Link>
        ))}
        <Link
          href="/admin/reset"
          className="border border-danger/40 bg-danger/10 p-5 transition hover:border-danger"
        >
          <p className="font-display text-lg uppercase text-danger">Reset Event</p>
          <p className="mt-1 text-sm text-chalk-dim">Wipe everything and start a fresh event — cannot be undone</p>
        </Link>
      </section>
    </div>
  );
}
