import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function AdminFixturesPage() {
  const supabase = await createClient();
  const [{ data: fixtures }, { data: clubs }] = await Promise.all([
    supabase.from('fixtures').select('*').order('matchweek'),
    supabase.from('clubs').select('id, name'),
  ]);

  const clubName = (id: string) => (clubs ?? []).find((c) => c.id === id)?.name ?? '—';
  const byMatchweek = new Map<number, typeof fixtures>();
  (fixtures ?? []).forEach((f) => {
    byMatchweek.set(f.matchweek, [...(byMatchweek.get(f.matchweek) ?? []), f]);
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="font-stats text-xs uppercase tracking-[0.3em] text-gold">Commissioner Console</p>
        <h1 className="mt-2 font-display text-4xl uppercase text-chalk">Fixtures &amp; Simulation</h1>
      </div>

      {Array.from(byMatchweek.entries()).map(([mw, mwFixtures]) => (
        <section key={mw}>
          <p className="text-xs uppercase tracking-wide text-gold">Matchweek {mw}</p>
          <div className="mt-2 divide-y divide-chalk-dim/20 border border-chalk-dim/20">
            {(mwFixtures ?? []).map((f) => (
              <Link
                key={f.id}
                href={`/admin/fixtures/${f.id}`}
                className="flex items-center justify-between px-4 py-3 text-sm hover:bg-pitch-light"
              >
                <span className="text-chalk">
                  {clubName(f.home_club_id)} <span className="text-chalk-dim">vs</span> {clubName(f.away_club_id)}
                </span>
                <span className="font-stats text-chalk-dim">
                  {f.played ? `${f.home_goals} — ${f.away_goals}` : 'Not played'}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
