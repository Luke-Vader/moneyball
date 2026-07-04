import type { AuctionLot, Manager, Player, Stadium } from '@/lib/supabase/database.types';

export interface ItemDetail {
  name: string;
  subtitle: string;
  basePrice: number;
}

export function resolveItem(
  lot: Pick<AuctionLot, 'item_type' | 'item_id'>,
  catalog: { stadiums: Stadium[]; managers: Manager[]; players: Player[] }
): ItemDetail | null {
  if (lot.item_type === 'stadium') {
    const s = catalog.stadiums.find((x) => x.id === lot.item_id);
    if (!s) return null;
    return { name: s.name, subtitle: `${s.category} · ${s.home_advantage_stars}★ home advantage`, basePrice: s.base_price };
  }
  if (lot.item_type === 'manager') {
    const m = catalog.managers.find((x) => x.id === lot.item_id);
    if (!m) return null;
    return { name: m.name, subtitle: m.style, basePrice: m.base_price };
  }
  const p = catalog.players.find((x) => x.id === lot.item_id);
  if (!p) return null;
  return { name: p.name, subtitle: `${p.position} · ${p.real_club} · OVR ${p.overall}`, basePrice: p.base_price };
}

export function formatMoney(value: number): string {
  return `₹${value.toFixed(1)}M`;
}
