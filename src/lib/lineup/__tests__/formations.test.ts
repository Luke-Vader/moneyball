import { describe, expect, it } from 'vitest';
import { FORMATIONS, FORMATION_REQUIREMENTS, bucketForPosition } from '../formations';
import type { Position } from '@/lib/supabase/database.types';

// These mirror the server-side truth enforced in
// supabase/migrations/..._functions.sql (submit_lineup). There is no live
// Postgres in this environment to run the SQL directly against, so this
// suite guards the TypeScript copy that drives client-side UX — a
// mismatch here would mean the lineup form gives misleading live feedback
// even though the RPC would still correctly reject an invalid XI.
describe('formation requirements', () => {
  it('every formation requires exactly 11 outfield+GK players', () => {
    for (const formation of FORMATIONS) {
      const req = FORMATION_REQUIREMENTS[formation];
      expect(1 + req.def + req.mid + req.fwd).toBe(11);
    }
  });

  it('covers all five specified formations', () => {
    expect(FORMATIONS.sort()).toEqual(['3-4-3', '3-5-2', '4-2-3-1', '4-3-3', '4-4-2'].sort());
  });
});

describe('bucketForPosition', () => {
  const cases: [Position, string][] = [
    ['GK', 'GK'],
    ['CB', 'DEF'],
    ['LB', 'DEF'],
    ['RB', 'DEF'],
    ['CDM', 'MID'],
    ['CM', 'MID'],
    ['CAM', 'MID'],
    ['LW', 'FWD'],
    ['RW', 'FWD'],
    ['ST', 'FWD'],
  ];

  it.each(cases)('maps %s to bucket %s', (position, bucket) => {
    expect(bucketForPosition(position)).toBe(bucket);
  });
});
