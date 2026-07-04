'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AuctionBid, AuctionLot, Club, Manager, Player, Stadium } from '@/lib/supabase/database.types';
import { resolveItem, formatMoney, type ItemDetail } from '@/lib/auction/resolve-item';

const LOT_STAGE_LABEL: Record<string, string> = {
  stadium: 'Stadiums',
  manager: 'Managers',
  player: 'Players',
};

export function AuctionRoom({ isAdmin, myClubId }: { isAdmin: boolean; myClubId: string | null }) {
  const supabase = useMemo(() => createClient(), []);
  const [catalog, setCatalog] = useState<{ stadiums: Stadium[]; managers: Manager[]; players: Player[] }>({
    stadiums: [],
    managers: [],
    players: [],
  });
  const [lots, setLots] = useState<AuctionLot[]>([]);
  const [currentLotId, setCurrentLotId] = useState<string | null>(null);
  const [bids, setBids] = useState<AuctionBid[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [bidAmount, setBidAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'info'; text: string } | null>(null);

  const refetch = useCallback(async () => {
    const [{ data: state }, { data: lotsData }, { data: clubsData }] = await Promise.all([
      supabase.from('auction_state').select('*').single(),
      supabase.from('auction_lots').select('*').order('lot_order'),
      supabase.from('clubs').select('*').order('name'),
    ]);
    setCurrentLotId(state?.current_lot_id ?? null);
    setLots(lotsData ?? []);
    setClubs(clubsData ?? []);

    if (state?.current_lot_id) {
      const { data: bidsData } = await supabase
        .from('auction_bids')
        .select('*')
        .eq('lot_id', state.current_lot_id)
        .order('amount', { ascending: false });
      setBids(bidsData ?? []);
    } else {
      setBids([]);
    }
  }, [supabase]);

  useEffect(() => {
    (async () => {
      const [{ data: stadiums }, { data: managers }, { data: players }] = await Promise.all([
        supabase.from('stadiums').select('*'),
        supabase.from('managers').select('*'),
        supabase.from('players').select('*'),
      ]);
      setCatalog({ stadiums: stadiums ?? [], managers: managers ?? [], players: players ?? [] });
      await refetch();
    })();

    const channel = supabase
      .channel('auction-room')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_state' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_bids' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_lots' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clubs' }, () => refetch())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, refetch]);

  const currentLot = lots.find((l) => l.id === currentLotId) ?? null;
  const currentItem: ItemDetail | null = currentLot ? resolveItem(currentLot, catalog) : null;
  const highestBid = bids[0] ?? null;
  const nextPendingLot = [...lots].filter((l) => l.status === 'pending').sort((a, b) => a.lot_order - b.lot_order)[0];
  const myClub = clubs.find((c) => c.id === myClubId) ?? null;

  async function handlePlaceBid() {
    if (!currentLot) return;
    const amount = Number(bidAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage({ type: 'error', text: 'Enter a valid bid amount.' });
      return;
    }
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.rpc('place_bid', { p_lot_id: currentLot.id, p_amount: amount });
    setBusy(false);
    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }
    setBidAmount('');
  }

  async function handleOpenNext() {
    if (!nextPendingLot) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.rpc('open_lot', { p_lot_id: nextPendingLot.id });
    setBusy(false);
    if (error) setMessage({ type: 'error', text: error.message });
  }

  async function handleConfirmSale() {
    if (!currentLot) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.rpc('confirm_sale', { p_lot_id: currentLot.id });
    setBusy(false);
    if (error) setMessage({ type: 'error', text: error.message });
  }

  async function handleMarkUnsold() {
    if (!currentLot) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.rpc('mark_lot_unsold', { p_lot_id: currentLot.id });
    setBusy(false);
    if (error) setMessage({ type: 'error', text: error.message });
  }

  const soldCount = lots.filter((l) => l.status === 'sold' || l.status === 'unsold').length;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-stats text-xs uppercase tracking-[0.3em] text-gold">
              Lot {currentLot ? currentLot.lot_order : '—'} of {lots.length}
            </p>
            <h1 className="mt-1 font-display text-3xl uppercase text-chalk">Live Auction</h1>
          </div>
          <p className="font-stats text-sm text-chalk-dim">
            {soldCount} / {lots.length} lots closed
          </p>
        </div>

        {currentItem && currentLot ? (
          <div className="border border-gold bg-pitch-light p-6">
            <p className="text-xs uppercase tracking-wide text-gold">{LOT_STAGE_LABEL[currentLot.item_type]}</p>
            <h2 className="mt-1 font-display text-4xl text-chalk">{currentItem.name}</h2>
            <p className="mt-1 text-chalk-dim">{currentItem.subtitle}</p>
            <div className="mt-4 flex flex-wrap items-baseline gap-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-chalk-dim">Base Price</p>
                <p className="font-stats text-xl text-chalk">{formatMoney(currentItem.basePrice)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-chalk-dim">Current Bid</p>
                <p className="font-stats text-xl text-gold">
                  {highestBid ? formatMoney(highestBid.amount) : 'No bids yet'}
                </p>
              </div>
              {highestBid && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-chalk-dim">Leading</p>
                  <p className="font-stats text-xl text-chalk">
                    {clubs.find((c) => c.id === highestBid.club_id)?.name ?? '—'}
                  </p>
                </div>
              )}
            </div>

            {myClubId && (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder={formatMoney((highestBid?.amount ?? currentItem.basePrice - 0.5) + 0.5)}
                  className="w-40 border border-chalk-dim/40 bg-pitch px-3 py-2 text-chalk outline-none focus:border-gold"
                />
                <button
                  onClick={handlePlaceBid}
                  disabled={busy}
                  className="bg-gold px-5 py-2 font-semibold uppercase tracking-wide text-pitch-dark hover:bg-gold-dim disabled:opacity-60"
                >
                  Place Bid
                </button>
                {myClub && (
                  <p className="font-stats text-sm text-chalk-dim">Your budget: {formatMoney(myClub.budget)}</p>
                )}
              </div>
            )}

            {isAdmin && (
              <div className="mt-6 flex gap-3 border-t border-chalk-dim/20 pt-4">
                <button
                  onClick={handleConfirmSale}
                  disabled={busy || !highestBid}
                  className="bg-success px-4 py-2 text-sm font-semibold uppercase tracking-wide text-pitch-dark hover:opacity-90 disabled:opacity-50"
                >
                  Hammer — Confirm Sale
                </button>
                <button
                  onClick={handleMarkUnsold}
                  disabled={busy}
                  className="border border-danger px-4 py-2 text-sm font-semibold uppercase tracking-wide text-danger hover:bg-danger/10 disabled:opacity-50"
                >
                  Mark Unsold
                </button>
              </div>
            )}

            <div className="mt-6 border-t border-chalk-dim/20 pt-4">
              <p className="text-xs uppercase tracking-wide text-chalk-dim">Bid History</p>
              <ul className="stat-table mt-2 space-y-1 text-sm">
                {bids.length === 0 && <li className="text-chalk-dim">No bids placed yet.</li>}
                {bids.map((b) => (
                  <li key={b.id} className="flex justify-between text-chalk">
                    <span>{clubs.find((c) => c.id === b.club_id)?.name ?? 'Unknown'}</span>
                    <span>{formatMoney(b.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="border border-chalk-dim/30 bg-pitch-light p-10 text-center text-chalk-dim">
            No lot is currently live. {isAdmin ? 'Open the next lot to begin.' : 'Waiting for the commissioner…'}
          </div>
        )}

        {isAdmin && !currentLot && nextPendingLot && (
          <button
            onClick={handleOpenNext}
            disabled={busy}
            className="w-full bg-gold px-4 py-3 font-semibold uppercase tracking-wide text-pitch-dark hover:bg-gold-dim disabled:opacity-60"
          >
            Open Next Lot: {resolveItem(nextPendingLot, catalog)?.name ?? '…'}
          </button>
        )}

        {message && (
          <p className={`text-sm ${message.type === 'error' ? 'text-danger' : 'text-chalk-dim'}`}>{message.text}</p>
        )}
      </div>

      <aside className="space-y-4">
        <div className="border border-gold/30 bg-pitch-light p-4">
          <p className="text-xs uppercase tracking-wide text-gold">Club Budgets</p>
          <ul className="stat-table mt-3 space-y-2 text-sm">
            {clubs
              .slice()
              .sort((a, b) => b.budget - a.budget)
              .map((c) => (
                <li key={c.id} className={`flex justify-between ${c.id === myClubId ? 'text-gold' : 'text-chalk'}`}>
                  <span>{c.name}</span>
                  <span>{formatMoney(c.budget)}</span>
                </li>
              ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
