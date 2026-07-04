import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LockControl } from './lock-control';
import { SimulateButton } from './simulate-button';

export default async function FixtureDetailPage({ params }: { params: Promise<{ fixtureId: string }> }) {
  const { fixtureId } = await params;
  const supabase = await createClient();

  const { data: fixture } = await supabase.from('fixtures').select('*').eq('id', fixtureId).single();
  if (!fixture) notFound();

  const [{ data: homeClub }, { data: awayClub }, { data: lineups }] = await Promise.all([
    supabase.from('clubs').select('id, name').eq('id', fixture.home_club_id).single(),
    supabase.from('clubs').select('id, name').eq('id', fixture.away_club_id).single(),
    supabase
      .from('lineups')
      .select('*')
      .in('club_id', [fixture.home_club_id, fixture.away_club_id]),
  ]);

  function lineupStatus(clubId: string) {
    const specific = lineups?.find((l) => l.club_id === clubId && l.fixture_id === fixtureId);
    const fallback = lineups?.find((l) => l.club_id === clubId && l.fixture_id === null);
    if (specific) return 'Submitted for this fixture';
    if (fallback) return 'Using default lineup';
    return 'Not submitted';
  }

  const ready = lineupStatus(fixture.home_club_id) !== 'Not submitted' && lineupStatus(fixture.away_club_id) !== 'Not submitted';

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <Link href="/admin/fixtures" className="text-xs uppercase tracking-wide text-chalk-dim hover:text-gold">
          ← All fixtures
        </Link>
        <h1 className="mt-2 font-display text-4xl uppercase text-chalk">
          {homeClub?.name} <span className="text-chalk-dim">vs</span> {awayClub?.name}
        </h1>
        <p className="mt-1 text-sm text-chalk-dim">Matchweek {fixture.matchweek}</p>
      </div>

      {fixture.played ? (
        <div className="border border-success/40 bg-success/10 p-5">
          <p className="font-display text-3xl text-chalk">
            {fixture.home_goals} — {fixture.away_goals}
          </p>
          <Link href={`/match/${fixture.id}`} className="mt-3 inline-block text-sm text-gold underline underline-offset-4">
            Open Match Centre →
          </Link>
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="border border-chalk-dim/30 bg-pitch-light p-4">
              <p className="text-xs uppercase tracking-wide text-chalk-dim">{homeClub?.name} lineup</p>
              <p className="mt-1 text-chalk">{lineupStatus(fixture.home_club_id)}</p>
            </div>
            <div className="border border-chalk-dim/30 bg-pitch-light p-4">
              <p className="text-xs uppercase tracking-wide text-chalk-dim">{awayClub?.name} lineup</p>
              <p className="mt-1 text-chalk">{lineupStatus(fixture.away_club_id)}</p>
            </div>
          </section>

          <LockControl fixtureId={fixture.id} lockAt={fixture.lineup_lock_at} />

          <SimulateButton fixtureId={fixture.id} ready={ready} />
        </>
      )}
    </div>
  );
}
