import { describe, expect, it } from 'vitest';
import { resolvePlayerName } from '../resolve-name';
import type { PlayerContext } from '../build-context';

function player(id: string, name: string): PlayerContext {
  return {
    id,
    name,
    position: 'ST',
    overall: 80,
    pace: 80,
    shooting: 80,
    passing: 80,
    dribbling: 80,
    defending: 80,
    physical: 80,
    fitness: 100,
    morale: 75,
    yellowCards: 0,
    nationality: 'Testland',
    realClub: 'Test FC',
    isCaptain: false,
  };
}

describe('resolvePlayerName', () => {
  const roster = [player('1', 'Kylian Mbappé'), player('2', 'Vinícius Jr.'), player('3', 'Trent Alexander-Arnold')];

  it('matches an exact name', () => {
    expect(resolvePlayerName('Kylian Mbappé', roster)?.id).toBe('1');
  });

  it('matches ignoring accents and punctuation', () => {
    expect(resolvePlayerName('Vinicius Jr', roster)?.id).toBe('2');
    expect(resolvePlayerName('vinícius jr.', roster)?.id).toBe('2');
  });

  it('matches an unambiguous last name', () => {
    expect(resolvePlayerName('Mbappe', roster)?.id).toBe('1');
  });

  it('returns null instead of guessing when no player matches', () => {
    expect(resolvePlayerName('Lionel Messi', roster)).toBeNull();
  });

  it('returns null when a last name is ambiguous across the roster', () => {
    const ambiguous = [player('a', 'John Smith'), player('b', 'Dave Smith')];
    expect(resolvePlayerName('Smith', ambiguous)).toBeNull();
  });
});
