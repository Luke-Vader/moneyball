import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Lineup, Player } from '@/lib/supabase/database.types';

export interface PlayerContext {
  id: string;
  name: string;
  position: string;
  overall: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  fitness: number;
  morale: number;
  yellowCards: number;
  nationality: string;
  realClub: string;
  isCaptain: boolean;
}

export interface SideContext {
  clubId: string;
  clubName: string;
  isHome: boolean;
  formation: string;
  tacticalStyle: string | null;
  defensiveLine: string | null;
  tempo: string | null;
  matchInstructions: string | null;
  manager: { name: string; style: string; specialAbility: string } | null;
  stadium: { name: string; category: string; homeAdvantageStars: number; passiveAbility: string } | null;
  leagueContext: {
    position: number;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    points: number;
    winStreak: number;
  };
  startingXI: PlayerContext[];
  bench: PlayerContext[];
  lineup: Lineup;
}

export interface MatchContext {
  fixtureId: string;
  matchweek: number;
  home: SideContext;
  away: SideContext;
}

function toPlayerContext(p: Player, captainId: string | null): PlayerContext {
  return {
    id: p.id,
    name: p.name,
    position: p.position,
    overall: p.overall,
    pace: p.pace,
    shooting: p.shooting,
    passing: p.passing,
    dribbling: p.dribbling,
    defending: p.defending,
    physical: p.physical,
    fitness: p.fitness,
    morale: p.morale,
    yellowCards: p.yellow_cards,
    nationality: p.nationality,
    realClub: p.real_club,
    isCaptain: p.id === captainId,
  };
}

export async function buildMatchContext(
  supabase: SupabaseClient<Database>,
  fixtureId: string
): Promise<MatchContext> {
  const { data: fixture } = await supabase.from('fixtures').select('*').eq('id', fixtureId).single();
  if (!fixture) throw new Error('Fixture not found');
  if (fixture.played) throw new Error('Fixture has already been played');

  const { data: standings } = await supabase
    .from('clubs')
    .select('id, name, points, gf, ga, played, won, drawn, lost, win_streak, stadium_id, manager_id')
    .order('points', { ascending: false })
    .order('gf', { ascending: false });
  if (!standings) throw new Error('Could not load league table');
  const table = standings;

  const positionOf = (clubId: string) => table.findIndex((c) => c.id === clubId) + 1;

  async function buildSide(clubId: string, isHome: boolean): Promise<SideContext> {
    const club = table.find((c) => c.id === clubId);
    if (!club) throw new Error('Club not found in standings');

    const fixtureLineup = await supabase
      .from('lineups')
      .select('*')
      .eq('club_id', clubId)
      .eq('fixture_id', fixtureId)
      .maybeSingle();
    let lineup = fixtureLineup.data;
    if (!lineup) {
      const defaultLineup = await supabase
        .from('lineups')
        .select('*')
        .eq('club_id', clubId)
        .is('fixture_id', null)
        .maybeSingle();
      lineup = defaultLineup.data;
    }
    if (!lineup) throw new Error(`${club.name} has not submitted a lineup for this fixture`);

    const allIds = [...lineup.starting_xi, ...lineup.bench];
    const { data: players } = await supabase.from('players').select('*').in('id', allIds);
    const byId = new Map((players ?? []).map((p) => [p.id, p]));

    const [managerRes, stadiumRes] = await Promise.all([
      club.manager_id ? supabase.from('managers').select('*').eq('id', club.manager_id).maybeSingle() : null,
      isHome && club.stadium_id ? supabase.from('stadiums').select('*').eq('id', club.stadium_id).maybeSingle() : null,
    ]);
    const manager = managerRes?.data ?? null;
    const stadium = stadiumRes?.data ?? null;

    return {
      clubId,
      clubName: club.name,
      isHome,
      formation: lineup.formation,
      tacticalStyle: lineup.style,
      defensiveLine: lineup.defensive_line,
      tempo: lineup.tempo,
      matchInstructions: lineup.instructions,
      manager: manager ? { name: manager.name, style: manager.style, specialAbility: manager.special_ability } : null,
      stadium: stadium
        ? {
            name: stadium.name,
            category: stadium.category,
            homeAdvantageStars: stadium.home_advantage_stars,
            passiveAbility: stadium.passive_ability,
          }
        : null,
      leagueContext: {
        position: positionOf(clubId),
        played: club.played,
        won: club.won,
        drawn: club.drawn,
        lost: club.lost,
        points: club.points,
        winStreak: club.win_streak,
      },
      startingXI: lineup.starting_xi.map((id) => byId.get(id)).filter((p): p is Player => Boolean(p)).map((p) => toPlayerContext(p, lineup.captain_id)),
      bench: lineup.bench.map((id) => byId.get(id)).filter((p): p is Player => Boolean(p)).map((p) => toPlayerContext(p, lineup.captain_id)),
      lineup,
    };
  }

  const [home, away] = await Promise.all([
    buildSide(fixture.home_club_id, true),
    buildSide(fixture.away_club_id, false),
  ]);

  return { fixtureId, matchweek: fixture.matchweek, home, away };
}
