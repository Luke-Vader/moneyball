import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatMoney } from '@/lib/auction/resolve-item';
import { buildTeamInsights } from '@/lib/reporting/team-report';

export default async function TeamPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const supabase = await createClient();

  const [{ data: club }, { data: standings }, { data: squad }] = await Promise.all([
    supabase.from('clubs').select('*').eq('id', clubId).single(),
    supabase.from('clubs').select('id, points, gf, ga').order('points', { ascending: false }).order('gf', { ascending: false }),
    supabase.from('players').select('*').eq('owner_club_id', clubId).order('overall', { ascending: false }),
  ]);
  if (!club) notFound();

  const position = (standings ?? []).findIndex((c) => c.id === clubId) + 1;
  const roster = squad ?? [];

  const { data: nextFixture } = await supabase
    .from('fixtures')
    .select('*')
    .or(`home_club_id.eq.${clubId},away_club_id.eq.${clubId}`)
    .eq('played', false)
    .order('matchweek')
    .limit(1)
    .maybeSingle();

  const rated = roster.filter((p) => p.appearances > 0);
  const topScorer = [...roster].sort((a, b) => b.goals - a.goals)[0];
  const bestPlayer = [...rated].sort((a, b) => b.rating_sum / b.appearances - a.rating_sum / a.appearances)[0];
  const insights = buildTeamInsights(club, roster);
  const unavailable = roster.filter((p) => p.injured || p.suspended);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div>
        <p className="font-stats text-xs uppercase tracking-[0.3em] text-gold">Team Report</p>
        <h1 className="mt-2 font-display text-4xl uppercase text-chalk">{club.name}</h1>
        <p className="mt-1 text-sm text-chalk-dim">Owner: {club.owner_name ?? '—'}</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-4">
        <Stat label="League Position" value={`#${position}`} />
        <Stat label="Record" value={`${club.won}W ${club.drawn}D ${club.lost}L`} />
        <Stat label="Goal Difference" value={`${club.gf - club.ga >= 0 ? '+' : ''}${club.gf - club.ga}`} />
        <Stat label="Win Streak" value={`${club.win_streak}`} />
        <Stat label="Cash Remaining" value={formatMoney(club.cash)} />
        <Stat label="Budget Remaining" value={formatMoney(club.budget)} />
        <Stat label="Outstanding Loan" value={formatMoney(club.loan)} />
        <Stat
          label="Biggest Win"
          value={club.biggest_win ? `${club.biggest_win.for}-${club.biggest_win.against} (MW${club.biggest_win.matchweek})` : '—'}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="border border-gold/30 bg-pitch-light p-4">
          <p className="text-xs uppercase tracking-wide text-gold">Top Scorer</p>
          <p className="mt-1 font-display text-xl text-chalk">{topScorer && topScorer.goals > 0 ? `${topScorer.name} (${topScorer.goals})` : '—'}</p>
        </div>
        <div className="border border-gold/30 bg-pitch-light p-4">
          <p className="text-xs uppercase tracking-wide text-gold">Best Player (avg rating)</p>
          <p className="mt-1 font-display text-xl text-chalk">
            {bestPlayer ? (
              <Link href={`/league/players/${bestPlayer.id}`} className="hover:text-gold">
                {bestPlayer.name} ({(bestPlayer.rating_sum / bestPlayer.appearances).toFixed(1)})
              </Link>
            ) : (
              '—'
            )}
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <InsightCard title="Strengths" items={insights.strengths} tone="text-success" />
        <InsightCard title="Weaknesses" items={insights.weaknesses} tone="text-danger" />
        <InsightCard title="Manager Recommendations" items={insights.recommendations} tone="text-gold" />
      </section>

      {insights.trends.length > 0 && (
        <p className="text-sm text-chalk-dim">{insights.trends.join(' ')}</p>
      )}

      {nextFixture && (
        <section className="border border-chalk-dim/30 bg-pitch-light p-4">
          <p className="text-xs uppercase tracking-wide text-chalk-dim">
            Availability for Matchweek {nextFixture.matchweek}
          </p>
          {unavailable.length === 0 ? (
            <p className="mt-1 text-sm text-success">Full squad available.</p>
          ) : (
            <ul className="mt-1 text-sm text-chalk">
              {unavailable.map((p) => (
                <li key={p.id} className="text-danger">
                  {p.name} — {p.injured ? 'Injured' : 'Suspended'}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section>
        <p className="text-xs uppercase tracking-wide text-chalk-dim">Squad</p>
        <div className="mt-2 overflow-x-auto border border-chalk-dim/20">
          <table className="w-full stat-table text-sm">
            <thead className="bg-pitch-light text-left text-xs uppercase tracking-wide text-chalk-dim">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Pos</th>
                <th className="px-3 py-2">Apps</th>
                <th className="px-3 py-2">Mins</th>
                <th className="px-3 py-2">Avg Rating</th>
                <th className="px-3 py-2">Fitness</th>
                <th className="px-3 py-2">Morale</th>
                <th className="px-3 py-2">YC/RC</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((p) => (
                <tr key={p.id} className="border-t border-chalk-dim/10">
                  <td className="px-3 py-2">
                    <Link href={`/league/players/${p.id}`} className="text-chalk hover:text-gold">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-chalk-dim">{p.position}</td>
                  <td className="px-3 py-2 text-chalk">{p.appearances}</td>
                  <td className="px-3 py-2 text-chalk">{p.minutes_played}</td>
                  <td className="px-3 py-2 text-chalk">{p.appearances > 0 ? (p.rating_sum / p.appearances).toFixed(1) : '—'}</td>
                  <td className="px-3 py-2 text-chalk-dim">{p.fitness}%</td>
                  <td className="px-3 py-2 text-chalk-dim">{p.morale}%</td>
                  <td className="px-3 py-2 text-chalk-dim">
                    {p.yellow_cards}/{p.red_cards}
                  </td>
                  <td className="px-3 py-2">
                    {p.injured && <span className="text-danger">Injured</span>}
                    {p.suspended && <span className="text-danger">Suspended</span>}
                    {!p.injured && !p.suspended && <span className="text-success">Available</span>}
                  </td>
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
      <p className="mt-1 font-stats text-lg text-chalk">{value}</p>
    </div>
  );
}

function InsightCard({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  return (
    <div className="border border-chalk-dim/30 bg-pitch-light p-4">
      <p className={`text-xs uppercase tracking-wide ${tone}`}>{title}</p>
      <ul className="mt-2 space-y-1 text-sm text-chalk">
        {items.length === 0 && <li className="text-chalk-dim">—</li>}
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
