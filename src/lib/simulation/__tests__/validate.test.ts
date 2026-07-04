import { describe, expect, it } from 'vitest';
import { validateAndResolve } from '../validate';
import { makeContext, HOME_STRIKER, AWAY_DEFENDER } from './fixtures';

function baseResult(overrides: Record<string, unknown> = {}) {
  return {
    finalScore: { home: 1, away: 0 },
    events: [{ minute: 23, type: 'goal', side: 'home', playerName: 'Homer Forwardson' }],
    commentary: [
      { minute: 0, type: 'kickoff', text: 'Kick off.' },
      { minute: 23, type: 'goal', text: 'Homer Forwardson scores!', refEventIndex: 0, side: 'home' },
      { minute: 45, type: 'halftime', text: 'Half time.' },
      { minute: 90, type: 'fulltime', text: 'Full time, 1-0.' },
    ],
    ...overrides,
  };
}

describe('validateAndResolve', () => {
  it('accepts a well-formed response and resolves player names to ids', () => {
    const result = validateAndResolve(JSON.stringify(baseResult()), makeContext());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.finalScore).toEqual({ home: 1, away: 0 });
      expect(result.data.events[0].player_id).toBe(HOME_STRIKER.id);
      expect(result.data.commentary.find((c) => c.type === 'goal')?.event_index).toBe(0);
    }
  });

  it('strips markdown code fences before parsing', () => {
    const fenced = '```json\n' + JSON.stringify(baseResult()) + '\n```';
    const result = validateAndResolve(fenced, makeContext());
    expect(result.ok).toBe(true);
  });

  it('rejects invalid JSON outright', () => {
    const result = validateAndResolve('not json at all', makeContext());
    expect(result.ok).toBe(false);
  });

  it('rejects a goal commentary line with no refEventIndex ("compute before narrate")', () => {
    const raw = baseResult({
      commentary: [
        { minute: 0, type: 'kickoff', text: 'Kick off.' },
        { minute: 23, type: 'goal', text: 'A goal happens, trust me.' }, // no refEventIndex/side
        { minute: 45, type: 'halftime', text: 'Half time.' },
        { minute: 90, type: 'fulltime', text: 'Full time, 1-0.' },
      ],
    });
    const result = validateAndResolve(JSON.stringify(raw), makeContext());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes('refEventIndex'))).toBe(true);
    }
  });

  it('rejects a commentary line whose refEventIndex points at a mismatched event', () => {
    const raw = baseResult({
      events: [
        { minute: 23, type: 'goal', side: 'home', playerName: 'Homer Forwardson' },
        { minute: 60, type: 'card', side: 'away', playerName: 'Dexter Backline', card: 'yellow' },
      ],
      commentary: [
        { minute: 0, type: 'kickoff', text: 'Kick off.' },
        // Claims a goal but points at the card event (index 1) — must be rejected.
        { minute: 23, type: 'goal', text: 'Homer Forwardson scores!', refEventIndex: 1, side: 'home' },
        { minute: 45, type: 'halftime', text: 'Half time.' },
        { minute: 90, type: 'fulltime', text: 'Full time, 1-0.' },
      ],
    });
    const result = validateAndResolve(JSON.stringify(raw), makeContext());
    expect(result.ok).toBe(false);
  });

  it('rejects an event naming a player who is not in either roster', () => {
    const raw = baseResult({
      events: [{ minute: 23, type: 'goal', side: 'home', playerName: 'Lionel Messi' }],
    });
    const result = validateAndResolve(JSON.stringify(raw), makeContext());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes('unknown player'))).toBe(true);
    }
  });

  it('rejects an event whose player is real but assigned to the wrong side', () => {
    // Homer Forwardson actually plays for the home side, not away.
    const raw = baseResult({
      events: [{ minute: 23, type: 'goal', side: 'away', playerName: 'Homer Forwardson' }],
      commentary: [
        { minute: 0, type: 'kickoff', text: 'Kick off.' },
        { minute: 23, type: 'goal', text: 'Scores!', refEventIndex: 0, side: 'away' },
        { minute: 45, type: 'halftime', text: 'Half time.' },
        { minute: 90, type: 'fulltime', text: 'Full time.' },
      ],
    });
    const result = validateAndResolve(JSON.stringify(raw), makeContext());
    expect(result.ok).toBe(false);
  });

  it('resolves accented/punctuation-variant names via fuzzy matching', () => {
    const context = makeContext({
      homeXI: [{ ...HOME_STRIKER, name: 'Vinícius Jr.' }],
    });
    const raw = baseResult({
      events: [{ minute: 23, type: 'goal', side: 'home', playerName: 'Vinicius Jr' }],
    });
    const result = validateAndResolve(JSON.stringify(raw), context);
    expect(result.ok).toBe(true);
  });

  it('requires exactly one halftime and one fulltime commentary line', () => {
    const raw = baseResult({
      commentary: [
        { minute: 0, type: 'kickoff', text: 'Kick off.' },
        { minute: 23, type: 'goal', text: 'Homer Forwardson scores!', refEventIndex: 0, side: 'home' },
        { minute: 90, type: 'fulltime', text: 'Full time, 1-0.' },
      ],
    });
    const result = validateAndResolve(JSON.stringify(raw), makeContext());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes('halftime'))).toBe(true);
    }
  });

  it('rejects an unresolved motmPlayerName', () => {
    const raw = baseResult({ motmPlayerName: 'Someone Else' });
    const result = validateAndResolve(JSON.stringify(raw), makeContext());
    expect(result.ok).toBe(false);
  });

  it('resolves a valid motmPlayerName from either side', () => {
    const raw = baseResult({ motmPlayerName: 'Dexter Backline' });
    const result = validateAndResolve(JSON.stringify(raw), makeContext());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.motmPlayerId).toBe(AWAY_DEFENDER.id);
  });
});
