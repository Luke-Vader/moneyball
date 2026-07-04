import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PreMatchView } from './pre-match-view';
import { MatchPlayback } from './match-playback';

export default async function MatchCentrePage({ params }: { params: Promise<{ fixtureId: string }> }) {
  const { fixtureId } = await params;
  const supabase = await createClient();

  const { data: fixture } = await supabase.from('fixtures').select('*').eq('id', fixtureId).single();
  if (!fixture) notFound();

  const [{ data: homeClub }, { data: awayClub }, { data: lineups }] = await Promise.all([
    supabase.from('clubs').select('*').eq('id', fixture.home_club_id).single(),
    supabase.from('clubs').select('*').eq('id', fixture.away_club_id).single(),
    supabase.from('lineups').select('*').in('club_id', [fixture.home_club_id, fixture.away_club_id]),
  ]);
  if (!homeClub || !awayClub) notFound();

  const homeLineup =
    lineups?.find((l) => l.club_id === homeClub.id && l.fixture_id === fixtureId) ??
    lineups?.find((l) => l.club_id === homeClub.id && l.fixture_id === null) ??
    null;
  const awayLineup =
    lineups?.find((l) => l.club_id === awayClub.id && l.fixture_id === fixtureId) ??
    lineups?.find((l) => l.club_id === awayClub.id && l.fixture_id === null) ??
    null;

  const [{ data: homeSquad }, { data: awaySquad }, { data: homeStadium }, { data: homeManager }, { data: awayManager }] =
    await Promise.all([
      homeLineup
        ? supabase.from('players').select('*').in('id', [...homeLineup.starting_xi, ...homeLineup.bench])
        : Promise.resolve({ data: [] }),
      awayLineup
        ? supabase.from('players').select('*').in('id', [...awayLineup.starting_xi, ...awayLineup.bench])
        : Promise.resolve({ data: [] }),
      homeClub.stadium_id ? supabase.from('stadiums').select('*').eq('id', homeClub.stadium_id).single() : Promise.resolve({ data: null }),
      homeClub.manager_id ? supabase.from('managers').select('*').eq('id', homeClub.manager_id).single() : Promise.resolve({ data: null }),
      awayClub.manager_id ? supabase.from('managers').select('*').eq('id', awayClub.manager_id).single() : Promise.resolve({ data: null }),
    ]);

  if (!fixture.played) {
    return (
      <PreMatchView
        fixture={fixture}
        homeClub={homeClub}
        awayClub={awayClub}
        homeLineup={homeLineup}
        awayLineup={awayLineup}
        homeSquad={homeSquad ?? []}
        awaySquad={awaySquad ?? []}
        homeStadium={homeStadium}
        homeManager={homeManager}
        awayManager={awayManager}
      />
    );
  }

  const [{ data: events }, { data: commentary }, { data: motm }] = await Promise.all([
    supabase.from('match_events').select('*').eq('fixture_id', fixtureId).order('minute'),
    supabase.from('commentary_lines').select('*').eq('fixture_id', fixtureId).order('minute'),
    fixture.motm_player_id
      ? supabase.from('players').select('*').eq('id', fixture.motm_player_id).single()
      : Promise.resolve({ data: null }),
  ]);

  const allPlayers = [...(homeSquad ?? []), ...(awaySquad ?? [])];

  return (
    <MatchPlayback
      fixture={fixture}
      homeClub={homeClub}
      awayClub={awayClub}
      events={events ?? []}
      commentary={commentary ?? []}
      players={allPlayers}
      motm={motm ?? null}
    />
  );
}
