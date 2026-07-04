import { createClient } from '@/lib/supabase/server';
import { resolveItem } from '@/lib/auction/resolve-item';
import { formatMoney } from '@/lib/auction/resolve-item';
import type { AuctionBid, AuctionLot } from '@/lib/supabase/database.types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default async function AdminHistoryPage() {
  const supabase = await createClient();

  const [
    { data: lots },
    { data: bids },
    { data: clubs },
    { data: stadiums },
    { data: managers },
    { data: players },
    { data: profiles },
    { data: simulationLogs },
    { data: transfers },
  ] = await Promise.all([
    supabase.from('auction_lots').select('*').order('lot_order'),
    supabase.from('auction_bids').select('*').order('created_at'),
    supabase.from('clubs').select('*').order('name'),
    supabase.from('stadiums').select('*'),
    supabase.from('managers').select('*'),
    supabase.from('players').select('*'),
    supabase.from('profiles').select('*').order('created_at'),
    supabase.from('simulation_logs').select('*').order('created_at', { ascending: false }),
    supabase.from('transfers').select('*').order('created_at', { ascending: false }),
  ]);

  const catalog = { stadiums: stadiums ?? [], managers: managers ?? [], players: players ?? [] };
  const clubName = (id: string | null) => (id ? (clubs ?? []).find((c) => c.id === id)?.name ?? 'Unknown' : '—');
  const bidsByLot = new Map<string, AuctionBid[]>();
  (bids ?? []).forEach((b) => bidsByLot.set(b.lot_id, [...(bidsByLot.get(b.lot_id) ?? []), b]));

  const totalBids = (bids ?? []).length;
  const totalSpend = (lots ?? []).reduce((sum, l) => sum + (l.final_price ?? 0), 0);
  const lotsSold = (lots ?? []).filter((l) => l.status === 'sold').length;
  const lotsUnsold = (lots ?? []).filter((l) => l.status === 'unsold').length;

  return (
    <div className="space-y-10">
      <div>
        <p className="font-stats text-xs uppercase tracking-[0.3em] text-gold">Commissioner Console</p>
        <h1 className="mt-2 font-display text-4xl uppercase text-chalk">Session History</h1>
        <p className="mt-2 text-sm text-chalk-dim">
          A permanent log of everything that has happened this event — every bid, every sale, every account, every
          simulated match.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-4">
        <Stat label="Lots Sold" value={`${lotsSold} / ${lots?.length ?? 0}`} />
        <Stat label="Lots Unsold" value={String(lotsUnsold)} />
        <Stat label="Total Bids Placed" value={String(totalBids)} />
        <Stat label="Total Auction Spend" value={formatMoney(totalSpend)} />
      </section>

      <section>
        <h2 className="font-display text-2xl uppercase text-chalk">Auction Log</h2>
        <p className="mt-1 text-sm text-chalk-dim">Every lot, in order, with its full bid history.</p>
        <div className="mt-3 overflow-x-auto border border-chalk-dim/20">
          <table className="w-full stat-table text-sm">
            <thead className="bg-pitch-light text-left text-xs uppercase tracking-wide text-chalk-dim">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Winner</th>
                <th className="px-3 py-2">Final Price</th>
                <th className="px-3 py-2">Bids</th>
              </tr>
            </thead>
            <tbody>
              {(lots ?? []).map((lot: AuctionLot) => {
                const item = resolveItem(lot, catalog);
                const lotBids = (bidsByLot.get(lot.id) ?? []).slice().sort((a, b) => b.amount - a.amount);
                return (
                  <tr key={lot.id} className="border-t border-chalk-dim/10 align-top">
                    <td className="px-3 py-2 text-chalk-dim">{lot.lot_order}</td>
                    <td className="px-3 py-2 text-chalk-dim capitalize">{lot.item_type}</td>
                    <td className="px-3 py-2 text-chalk">{item?.name ?? 'Unknown'}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={lot.status} />
                    </td>
                    <td className="px-3 py-2 text-chalk">{clubName(lot.winning_club_id)}</td>
                    <td className="px-3 py-2 text-gold">{lot.final_price != null ? formatMoney(lot.final_price) : '—'}</td>
                    <td className="px-3 py-2">
                      {lotBids.length === 0 ? (
                        <span className="text-chalk-dim">0</span>
                      ) : (
                        <details>
                          <summary className="cursor-pointer text-chalk-dim hover:text-gold">
                            {lotBids.length} bid{lotBids.length > 1 ? 's' : ''}
                          </summary>
                          <ul className="mt-2 space-y-1">
                            {lotBids.map((b) => (
                              <li key={b.id} className="flex justify-between gap-4 text-chalk-dim">
                                <span>{clubName(b.club_id)}</span>
                                <span className="text-chalk">{formatMoney(b.amount)}</span>
                                <span className="whitespace-nowrap">{formatDate(b.created_at)}</span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl uppercase text-chalk">Club Ownership</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(clubs ?? []).map((club) => {
            const stadium = (stadiums ?? []).find((s) => s.owner_club_id === club.id);
            const manager = (managers ?? []).find((m) => m.owner_club_id === club.id);
            const squad = (players ?? []).filter((p) => p.owner_club_id === club.id);
            return (
              <div key={club.id} className="border border-chalk-dim/30 bg-pitch-light p-4">
                <p className="font-display text-lg text-chalk">{club.name}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-chalk-dim">
                  Stadium: <span className="text-chalk">{stadium?.name ?? '—'}</span>
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-chalk-dim">
                  Manager: <span className="text-chalk">{manager?.name ?? '—'}</span>
                </p>
                <p className="mt-2 text-xs uppercase tracking-wide text-chalk-dim">Players ({squad.length})</p>
                <ul className="mt-1 space-y-0.5 text-sm text-chalk-dim">
                  {squad.length === 0 && <li>—</li>}
                  {squad.map((p) => (
                    <li key={p.id}>
                      {p.name} <span className="text-chalk-dim">({p.position})</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl uppercase text-chalk">Registrations</h2>
        <div className="mt-3 overflow-x-auto border border-chalk-dim/20">
          <table className="w-full stat-table text-sm">
            <thead className="bg-pitch-light text-left text-xs uppercase tracking-wide text-chalk-dim">
              <tr>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Club</th>
                <th className="px-3 py-2">Signed Up</th>
              </tr>
            </thead>
            <tbody>
              {(profiles ?? []).map((p) => (
                <tr key={p.id} className="border-t border-chalk-dim/10">
                  <td className="px-3 py-2 text-chalk">{p.email}</td>
                  <td className="px-3 py-2 text-chalk-dim capitalize">{p.role.replace('_', ' ')}</td>
                  <td className="px-3 py-2 text-chalk-dim">{clubName(p.club_id)}</td>
                  <td className="px-3 py-2 text-chalk-dim">{formatDate(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl uppercase text-chalk">Simulation Log</h2>
        <div className="mt-3 overflow-x-auto border border-chalk-dim/20">
          <table className="w-full stat-table text-sm">
            <thead className="bg-pitch-light text-left text-xs uppercase tracking-wide text-chalk-dim">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Attempt</th>
                <th className="px-3 py-2">Provider / Model</th>
                <th className="px-3 py-2">Result</th>
                <th className="px-3 py-2">Detail</th>
              </tr>
            </thead>
            <tbody>
              {(simulationLogs ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-chalk-dim">
                    No matches simulated yet.
                  </td>
                </tr>
              )}
              {(simulationLogs ?? []).map((log) => (
                <tr key={log.id} className="border-t border-chalk-dim/10 align-top">
                  <td className="px-3 py-2 text-chalk-dim">{formatDate(log.created_at)}</td>
                  <td className="px-3 py-2 text-chalk-dim">{log.attempt}</td>
                  <td className="px-3 py-2 text-chalk-dim">
                    {log.provider} / {log.model}
                  </td>
                  <td className="px-3 py-2">
                    {log.success ? <span className="text-success">Success</span> : <span className="text-danger">Failed</span>}
                  </td>
                  <td className="px-3 py-2">
                    <details>
                      <summary className="cursor-pointer text-chalk-dim hover:text-gold">View raw exchange</summary>
                      {log.validation_errors ? (
                        <pre className="mt-2 max-w-xl overflow-x-auto whitespace-pre-wrap text-xs text-danger">
                          {JSON.stringify(log.validation_errors, null, 2)}
                        </pre>
                      ) : null}
                      <pre className="mt-2 max-w-xl overflow-x-auto whitespace-pre-wrap text-xs text-chalk-dim">
                        {(log.raw_response ?? '').slice(0, 2000)}
                      </pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl uppercase text-chalk">Transfers</h2>
        <div className="mt-3 overflow-x-auto border border-chalk-dim/20">
          <table className="w-full stat-table text-sm">
            <thead className="bg-pitch-light text-left text-xs uppercase tracking-wide text-chalk-dim">
              <tr>
                <th className="px-3 py-2">MW</th>
                <th className="px-3 py-2">Buyer</th>
                <th className="px-3 py-2">Seller</th>
                <th className="px-3 py-2">Player</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {(transfers ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-chalk-dim">
                    No transfers recorded yet.
                  </td>
                </tr>
              )}
              {(transfers ?? []).map((t) => (
                <tr key={t.id} className="border-t border-chalk-dim/10">
                  <td className="px-3 py-2 text-chalk-dim">{t.matchweek}</td>
                  <td className="px-3 py-2 text-chalk">{clubName(t.buyer_club_id)}</td>
                  <td className="px-3 py-2 text-chalk-dim">{clubName(t.seller_club_id)}</td>
                  <td className="px-3 py-2 text-chalk-dim">
                    {(players ?? []).find((p) => p.id === t.player_id)?.name ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-gold">{formatMoney(t.amount)}</td>
                  <td className="px-3 py-2 text-chalk-dim">{t.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-chalk-dim/30 bg-pitch-light p-4">
      <p className="text-xs uppercase tracking-wide text-chalk-dim">{label}</p>
      <p className="mt-1 font-stats text-xl text-chalk">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'sold'
      ? 'text-success'
      : status === 'unsold'
        ? 'text-danger'
        : status === 'live'
          ? 'text-gold'
          : 'text-chalk-dim';
  return <span className={cls}>{status}</span>;
}
