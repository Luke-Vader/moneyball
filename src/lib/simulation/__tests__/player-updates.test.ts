import { describe, expect, it } from 'vitest';
import { computePlayerUpdates } from '../player-updates';
import { makeContext, HOME_STRIKER, HOME_KEEPER, AWAY_STRIKER, AWAY_DEFENDER } from './fixtures';
import type { ValidatedSimulation } from '../validate';

function baseValidated(overrides: Partial<ValidatedSimulation> = {}): ValidatedSimulation {
  return {
    finalScore: { home: 1, away: 0 },
    events: [],
    commentary: [],
    playerRatings: [],
    motmPlayerId: null,
    possession: null,
    shots: null,
    sot: null,
    corners: null,
    strengthBreakdown: null,
    ...overrides,
  };
}

function findUpdate(updates: ReturnType<typeof computePlayerUpdates>, playerId: string) {
  const u = updates.find((x) => x.player_id === playerId);
  if (!u) throw new Error(`No update computed for ${playerId}`);
  return u;
}

describe('computePlayerUpdates', () => {
  it('credits starters with an appearance, 90 minutes, and fitness drain', () => {
    const updates = computePlayerUpdates(makeContext(), baseValidated(), 3);
    const u = findUpdate(updates, HOME_STRIKER.id);
    expect(u.appearances_delta).toBe(1);
    expect(u.minutes_delta).toBe(90);
    expect(u.fitness_delta).toBeLessThan(0);
  });

  it('gives unused bench players a small fitness recovery instead of an appearance', () => {
    const context = makeContext();
    context.home.bench = [{ ...HOME_KEEPER, id: 'bench-1', name: 'Bench Player' }];
    const updates = computePlayerUpdates(context, baseValidated(), 3);
    const u = findUpdate(updates, 'bench-1');
    expect(u.appearances_delta).toBe(0);
    expect(u.fitness_delta).toBeGreaterThan(0);
  });

  it('raises morale for the winning side and lowers it for the losing side', () => {
    const updates = computePlayerUpdates(makeContext(), baseValidated({ finalScore: { home: 2, away: 0 } }), 3);
    expect(findUpdate(updates, HOME_STRIKER.id).morale_delta).toBeGreaterThan(0);
    expect(findUpdate(updates, AWAY_STRIKER.id).morale_delta).toBeLessThan(0);
  });

  it('leaves morale unchanged on a draw', () => {
    const updates = computePlayerUpdates(makeContext(), baseValidated({ finalScore: { home: 1, away: 1 } }), 3);
    expect(findUpdate(updates, HOME_STRIKER.id).morale_delta).toBe(0);
    expect(findUpdate(updates, AWAY_STRIKER.id).morale_delta).toBe(0);
  });

  it('credits a goal and its assist', () => {
    const updates = computePlayerUpdates(
      makeContext(),
      baseValidated({
        events: [
          {
            minute: 10,
            type: 'goal',
            side: 'home',
            player_id: HOME_STRIKER.id,
            assist_player_id: HOME_KEEPER.id,
            card_type: null,
            detail: null,
          },
        ],
      }),
      3
    );
    expect(findUpdate(updates, HOME_STRIKER.id).goals_delta).toBe(1);
    expect(findUpdate(updates, HOME_KEEPER.id).assists_delta).toBe(1);
  });

  it('suspends a player immediately on a red card', () => {
    const updates = computePlayerUpdates(
      makeContext(),
      baseValidated({
        events: [
          { minute: 50, type: 'card', side: 'away', player_id: AWAY_STRIKER.id, assist_player_id: null, card_type: 'red', detail: null },
        ],
      }),
      3
    );
    const u = findUpdate(updates, AWAY_STRIKER.id);
    expect(u.red_delta).toBe(1);
    expect(u.set_suspended).toBe(true);
  });

  it('suspends a player once accumulated yellow cards hit a multiple of three', () => {
    // AWAY_DEFENDER fixture already carries 2 yellow cards from prior matches.
    const updates = computePlayerUpdates(
      makeContext(),
      baseValidated({
        events: [
          { minute: 70, type: 'card', side: 'away', player_id: AWAY_DEFENDER.id, assist_player_id: null, card_type: 'yellow', detail: null },
        ],
      }),
      3
    );
    const u = findUpdate(updates, AWAY_DEFENDER.id);
    expect(u.yellow_delta).toBe(1);
    expect(u.set_suspended).toBe(true);
  });

  it('does not suspend on a first yellow card', () => {
    const updates = computePlayerUpdates(
      makeContext(),
      baseValidated({
        events: [
          { minute: 70, type: 'card', side: 'home', player_id: HOME_STRIKER.id, assist_player_id: null, card_type: 'yellow', detail: null },
        ],
      }),
      3
    );
    expect(findUpdate(updates, HOME_STRIKER.id).set_suspended).toBeNull();
  });

  it('flags an injury and sets a return matchweek', () => {
    const updates = computePlayerUpdates(
      makeContext(),
      baseValidated({
        events: [
          { minute: 30, type: 'injury', side: 'home', player_id: HOME_STRIKER.id, assist_player_id: null, card_type: null, detail: 'Hamstring' },
        ],
      }),
      3
    );
    const u = findUpdate(updates, HOME_STRIKER.id);
    expect(u.set_injured).toBe(true);
    expect(u.injury_return_matchweek).toBe(4);
  });

  it('uses the LLM-provided rating when present instead of the fallback', () => {
    const updates = computePlayerUpdates(
      makeContext(),
      baseValidated({ playerRatings: [{ playerId: HOME_STRIKER.id, side: 'home', rating: 9.1 }] }),
      3
    );
    expect(findUpdate(updates, HOME_STRIKER.id).rating_delta).toBe(9.1);
  });
});
