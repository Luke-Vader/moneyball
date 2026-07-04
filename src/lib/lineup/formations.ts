import type { Formation, Position } from '@/lib/supabase/database.types';

export const FORMATIONS: Formation[] = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '3-4-3'];

// Mirrors the DEF/MID/FWD bucket counts enforced server-side in
// submit_lineup() (supabase/migrations/..._functions.sql). Keep in sync —
// this copy is for instant client-side feedback only, the RPC is the
// source of truth.
export const FORMATION_REQUIREMENTS: Record<Formation, { def: number; mid: number; fwd: number }> = {
  '4-3-3': { def: 4, mid: 3, fwd: 3 },
  '4-4-2': { def: 4, mid: 4, fwd: 2 },
  '4-2-3-1': { def: 4, mid: 5, fwd: 1 },
  '3-5-2': { def: 3, mid: 5, fwd: 2 },
  '3-4-3': { def: 3, mid: 4, fwd: 3 },
};

export type PositionBucket = 'GK' | 'DEF' | 'MID' | 'FWD';

export function bucketForPosition(position: Position): PositionBucket {
  if (position === 'GK') return 'GK';
  if (position === 'CB' || position === 'LB' || position === 'RB') return 'DEF';
  if (position === 'CDM' || position === 'CM' || position === 'CAM') return 'MID';
  return 'FWD';
}
