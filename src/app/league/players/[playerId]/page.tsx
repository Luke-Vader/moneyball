import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProgressionChart } from './progression-chart';

export default async function PlayerProgressionPage({ params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params;
  const supabase = await createClient();

  const { data: player } = await supabase.from('players').select('*').eq('id', playerId).single();
  if (!player) notFound();

  const { data: stats } = await supabase
    .from('player_match_stats')
    .select('*')
    .eq('player_id', playerId)
    .order('matchweek');

  const series = (stats ?? []).map((s) => ({
    matchweek: s.matchweek,
    rating: s.rating ?? null,
    minutes: s.minutes,
    goals: s.goals,
    assists: s.assists,
    fitness: s.fitness_after,
    morale: s.morale_after,
    cards: s.yellow_cards + s.red_cards,
    injured: s.injured,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div>
        <p className="font-stats text-xs uppercase tracking-[0.3em] text-gold">Player Progression</p>
        <h1 className="mt-2 font-display text-4xl uppercase text-chalk">{player.name}</h1>
        <p className="mt-1 text-sm text-chalk-dim">
          {player.position} · {player.real_club} · {player.nationality} · OVR {player.overall}
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-4">
        <Stat label="Appearances" value={String(player.appearances)} />
        <Stat label="Goals" value={String(player.goals)} />
        <Stat label="Assists" value={String(player.assists)} />
        <Stat label="Avg Rating" value={player.appearances > 0 ? (player.rating_sum / player.appearances).toFixed(1) : '—'} />
      </section>

      {series.length > 0 ? (
        <ProgressionChart series={series} />
      ) : (
        <p className="text-sm text-chalk-dim">No matches played yet this season.</p>
      )}

      {series.length > 0 && (
        <div className="overflow-x-auto border border-chalk-dim/20">
          <table className="w-full stat-table text-sm">
            <thead className="bg-pitch-light text-left text-xs uppercase tracking-wide text-chalk-dim">
              <tr>
                <th className="px-3 py-2">MW</th>
                <th className="px-3 py-2">Mins</th>
                <th className="px-3 py-2">Rating</th>
                <th className="px-3 py-2">G</th>
                <th className="px-3 py-2">A</th>
                <th className="px-3 py-2">Cards</th>
                <th className="px-3 py-2">Fitness</th>
                <th className="px-3 py-2">Morale</th>
                <th className="px-3 py-2">Injured</th>
              </tr>
            </thead>
            <tbody>
              {series.map((s) => (
                <tr key={s.matchweek} className="border-t border-chalk-dim/10 text-chalk">
                  <td className="px-3 py-2">{s.matchweek}</td>
                  <td className="px-3 py-2">{s.minutes}</td>
                  <td className="px-3 py-2">{s.rating?.toFixed(1) ?? '—'}</td>
                  <td className="px-3 py-2">{s.goals}</td>
                  <td className="px-3 py-2">{s.assists}</td>
                  <td className="px-3 py-2">{s.cards}</td>
                  <td className="px-3 py-2">{s.fitness ?? '—'}%</td>
                  <td className="px-3 py-2">{s.morale ?? '—'}%</td>
                  <td className="px-3 py-2">{s.injured ? <span className="text-danger">Yes</span> : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
