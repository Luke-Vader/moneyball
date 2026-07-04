import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatMoney } from '@/lib/auction/resolve-item';
import { AdminFinanceControls } from './admin-finance-controls';

export default async function FinancePage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: season }, { data: clubs }] = await Promise.all([
    supabase.from('season_state').select('*').single(),
    supabase.from('clubs').select('id, name, cash, budget, loan').order('name'),
  ]);

  const financeQuery = supabase.from('finance_log').select('*').order('matchweek');
  const { data: financeLog } =
    profile.role === 'admin' || !profile.club_id
      ? await financeQuery
      : await financeQuery.eq('club_id', profile.club_id);

  const clubName = (id: string) => (clubs ?? []).find((c) => c.id === id)?.name ?? '—';

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div>
        <p className="font-stats text-xs uppercase tracking-[0.3em] text-gold">Financial System</p>
        <h1 className="mt-2 font-display text-4xl uppercase text-chalk">Finance</h1>
      </div>

      {profile.role === 'admin' && season && (
        <AdminFinanceControls
          currentMatchweek={season.current_matchweek}
          clubs={clubs ?? []}
          alreadySettled={(financeLog ?? []).some((f) => f.matchweek === season.current_matchweek)}
        />
      )}

      <section>
        <p className="text-xs uppercase tracking-wide text-chalk-dim">
          {profile.role === 'admin' ? 'All Clubs — Matchweek Ledger' : 'Your Matchweek Ledger'}
        </p>
        <div className="mt-2 overflow-x-auto border border-chalk-dim/20">
          <table className="w-full stat-table text-sm">
            <thead className="bg-pitch-light text-left text-xs uppercase tracking-wide text-chalk-dim">
              <tr>
                <th className="px-3 py-2">MW</th>
                {profile.role === 'admin' && <th className="px-3 py-2">Club</th>}
                <th className="px-3 py-2">Opening</th>
                <th className="px-3 py-2">Stadium Rev.</th>
                <th className="px-3 py-2">Prize</th>
                <th className="px-3 py-2">Maintenance</th>
                <th className="px-3 py-2">Transfers</th>
                <th className="px-3 py-2">Closing</th>
              </tr>
            </thead>
            <tbody>
              {(financeLog ?? []).map((row) => (
                <tr key={row.id} className="border-t border-chalk-dim/10 text-chalk">
                  <td className="px-3 py-2">{row.matchweek}</td>
                  {profile.role === 'admin' && <td className="px-3 py-2">{clubName(row.club_id)}</td>}
                  <td className="px-3 py-2">{formatMoney(row.opening_cash)}</td>
                  <td className="px-3 py-2 text-success">+{formatMoney(row.stadium_revenue)}</td>
                  <td className="px-3 py-2 text-success">+{formatMoney(row.prize_money)}</td>
                  <td className="px-3 py-2 text-danger">-{formatMoney(row.maintenance)}</td>
                  <td className={row.transfers_delta >= 0 ? 'px-3 py-2 text-success' : 'px-3 py-2 text-danger'}>
                    {row.transfers_delta >= 0 ? '+' : ''}
                    {formatMoney(row.transfers_delta)}
                  </td>
                  <td className="px-3 py-2 font-semibold text-gold">{formatMoney(row.closing_cash)}</td>
                </tr>
              ))}
              {(financeLog ?? []).length === 0 && (
                <tr>
                  <td colSpan={profile.role === 'admin' ? 7 : 6} className="px-3 py-4 text-center text-chalk-dim">
                    No matchweeks settled yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
