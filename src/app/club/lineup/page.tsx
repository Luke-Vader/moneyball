import Link from 'next/link';
import { requireClubOwner } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { LineupForm } from './lineup-form';

export default async function LineupPage({
  searchParams,
}: {
  searchParams: Promise<{ target?: string }>;
}) {
  const profile = await requireClubOwner();
  const { target } = await searchParams;
  const supabase = await createClient();

  const [{ data: squad }, { data: upcomingFixtures }, { data: clubs }] = await Promise.all([
    supabase
      .from('players')
      .select('*')
      .eq('owner_club_id', profile.club_id)
      .order('position')
      .order('overall', { ascending: false }),
    supabase
      .from('fixtures')
      .select('*')
      .or(`home_club_id.eq.${profile.club_id},away_club_id.eq.${profile.club_id}`)
      .eq('played', false)
      .order('matchweek'),
    supabase.from('clubs').select('id, name'),
  ]);

  const clubName = (id: string) => (clubs ?? []).find((c) => c.id === id)?.name ?? 'TBD';
  const fixtureId = target && target !== 'default' ? target : null;

  const lineupQuery = supabase.from('lineups').select('*').eq('club_id', profile.club_id);
  const { data: existingLineup } = await (fixtureId
    ? lineupQuery.eq('fixture_id', fixtureId)
    : lineupQuery.is('fixture_id', null)
  ).maybeSingle();

  const selectedFixture = fixtureId ? (upcomingFixtures ?? []).find((f) => f.id === fixtureId) : null;
  const locked = selectedFixture?.lineup_lock_at ? new Date(selectedFixture.lineup_lock_at) < new Date() : false;

  return (
    <div className="space-y-8">
      <div>
        <p className="font-stats text-xs uppercase tracking-[0.3em] text-gold">Phase 3</p>
        <h1 className="mt-2 font-display text-4xl uppercase text-chalk">Squad Submission</h1>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-chalk-dim/20 pb-4">
        <Link
          href="/club/lineup?target=default"
          className={`border px-3 py-1.5 text-sm ${
            !fixtureId ? 'border-gold text-gold' : 'border-chalk-dim/30 text-chalk-dim hover:border-gold'
          }`}
        >
          Default Lineup
        </Link>
        {(upcomingFixtures ?? []).map((f) => {
          const opponent = f.home_club_id === profile.club_id ? f.away_club_id : f.home_club_id;
          return (
            <Link
              key={f.id}
              href={`/club/lineup?target=${f.id}`}
              className={`border px-3 py-1.5 text-sm ${
                fixtureId === f.id ? 'border-gold text-gold' : 'border-chalk-dim/30 text-chalk-dim hover:border-gold'
              }`}
            >
              MW{f.matchweek} vs {clubName(opponent)}
            </Link>
          );
        })}
      </div>

      {locked ? (
        <p className="border border-danger/40 bg-danger/10 p-4 text-sm text-chalk">
          The lineup deadline for this fixture has passed. Contact the commissioner if you need a change.
        </p>
      ) : (
        <LineupForm
          clubId={profile.club_id}
          fixtureId={fixtureId}
          squad={squad ?? []}
          existingLineup={existingLineup ?? null}
        />
      )}
    </div>
  );
}
