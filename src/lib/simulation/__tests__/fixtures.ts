import type { MatchContext, PlayerContext, SideContext } from '../build-context';

function player(overrides: Partial<PlayerContext> & { id: string; name: string }): PlayerContext {
  return {
    position: 'ST',
    overall: 75,
    pace: 75,
    shooting: 75,
    passing: 75,
    dribbling: 75,
    defending: 75,
    physical: 75,
    fitness: 100,
    morale: 75,
    yellowCards: 0,
    nationality: 'Testland',
    realClub: 'Test FC',
    isCaptain: false,
    ...overrides,
  };
}

// Deliberately share no words between home/away names — a shared token
// (e.g. two different "... Striker"s) would spuriously satisfy
// resolvePlayerName's last-name fallback and mask real side-mismatch bugs.
export const HOME_STRIKER = player({ id: 'home-1', name: 'Homer Forwardson' });
export const HOME_KEEPER = player({ id: 'home-2', name: 'Hank Gloveman', position: 'GK' });
export const AWAY_STRIKER = player({ id: 'away-1', name: 'Ashton Wingfield' });
export const AWAY_DEFENDER = player({ id: 'away-2', name: 'Dexter Backline', position: 'CB', yellowCards: 2 });

function side(overrides: Partial<SideContext> & Pick<SideContext, 'clubId' | 'clubName' | 'isHome'>): SideContext {
  return {
    formation: '4-3-3',
    tacticalStyle: 'Possession',
    defensiveLine: 'Medium',
    tempo: 'Balanced',
    matchInstructions: null,
    manager: null,
    stadium: null,
    leagueContext: { position: 1, played: 0, won: 0, drawn: 0, lost: 0, points: 0, winStreak: 0 },
    startingXI: [],
    bench: [],
    lineup: {
      id: 'lineup-1',
      club_id: overrides.clubId,
      fixture_id: null,
      starting_xi: [],
      bench: [],
      formation: '4-3-3',
      style: null,
      defensive_line: null,
      tempo: null,
      captain_id: null,
      instructions: null,
      locked: false,
      submitted_at: '',
      created_at: '',
    },
    ...overrides,
  };
}

export function makeContext(overrides?: { homeXI?: PlayerContext[]; awayXI?: PlayerContext[] }): MatchContext {
  return {
    fixtureId: 'fixture-1',
    matchweek: 3,
    home: side({
      clubId: 'home-club',
      clubName: 'Home FC',
      isHome: true,
      startingXI: overrides?.homeXI ?? [HOME_KEEPER, HOME_STRIKER],
    }),
    away: side({
      clubId: 'away-club',
      clubName: 'Away FC',
      isHome: false,
      startingXI: overrides?.awayXI ?? [AWAY_STRIKER, AWAY_DEFENDER],
    }),
  };
}
