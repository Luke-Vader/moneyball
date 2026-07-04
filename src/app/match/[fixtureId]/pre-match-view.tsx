import type { Club, Fixture, Lineup, Manager, Player, Stadium } from '@/lib/supabase/database.types';

function average(players: Player[], key: keyof Player): number {
  const nums = players.map((p) => p[key]).filter((v): v is number => typeof v === 'number');
  if (nums.length === 0) return 0;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function startersOf(squad: Player[], lineup: Lineup | null): Player[] {
  if (!lineup) return [];
  return lineup.starting_xi.map((id) => squad.find((p) => p.id === id)).filter((p): p is Player => Boolean(p));
}

export function PreMatchView({
  fixture,
  homeClub,
  awayClub,
  homeLineup,
  awayLineup,
  homeSquad,
  awaySquad,
  homeStadium,
  homeManager,
  awayManager,
}: {
  fixture: Fixture;
  homeClub: Club;
  awayClub: Club;
  homeLineup: Lineup | null;
  awayLineup: Lineup | null;
  homeSquad: Player[];
  awaySquad: Player[];
  homeStadium: Stadium | null;
  homeManager: Manager | null;
  awayManager: Manager | null;
}) {
  const homeStarters = startersOf(homeSquad, homeLineup);
  const awayStarters = startersOf(awaySquad, awayLineup);

  const rows: [string, keyof Player][] = [
    ['Overall', 'overall'],
    ['Pace', 'pace'],
    ['Shooting', 'shooting'],
    ['Passing', 'passing'],
    ['Dribbling', 'dribbling'],
    ['Defending', 'defending'],
    ['Physical', 'physical'],
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div className="text-center">
        <p className="font-stats text-xs uppercase tracking-[0.3em] text-gold">
          Matchweek {fixture.matchweek} — Pre-Match
        </p>
        <h1 className="mt-2 font-display text-4xl uppercase text-chalk">
          {homeClub.name} <span className="text-chalk-dim">vs</span> {awayClub.name}
        </h1>
        <p className="mt-2 text-sm text-chalk-dim">
          Strength breakdowns below — no winner is predicted. The result is computed at kickoff, not before.
        </p>
      </div>

      <section className="overflow-x-auto border border-gold/30">
        <table className="w-full stat-table text-sm">
          <thead className="bg-pitch-light text-xs uppercase tracking-wide text-chalk-dim">
            <tr>
              <th className="px-4 py-2 text-left">{homeClub.name}</th>
              <th className="px-4 py-2">Attribute</th>
              <th className="px-4 py-2 text-right">{awayClub.name}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, key]) => (
              <tr key={key} className="border-t border-chalk-dim/10">
                <td className="px-4 py-2 text-chalk">{average(homeStarters, key)}</td>
                <td className="px-4 py-2 text-center text-chalk-dim">{label}</td>
                <td className="px-4 py-2 text-right text-chalk">{average(awayStarters, key)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <TacticCard title={homeClub.name} lineup={homeLineup} manager={homeManager} />
        <TacticCard title={awayClub.name} lineup={awayLineup} manager={awayManager} />
      </section>

      {homeStadium && (
        <section className="border border-gold/30 bg-pitch-light p-5">
          <p className="text-xs uppercase tracking-wide text-gold">Home Ground — {homeStadium.name}</p>
          <p className="mt-1 text-sm text-chalk-dim">
            {homeStadium.category} · {homeStadium.home_advantage_stars}★ home advantage
          </p>
          <p className="mt-2 text-chalk">{homeStadium.passive_ability}</p>
        </section>
      )}

      <section>
        <p className="text-xs uppercase tracking-wide text-chalk-dim">Key Player Battles</p>
        <ul className="mt-2 space-y-1 text-sm text-chalk">
          {homeStarters
            .slice()
            .sort((a, b) => b.overall - a.overall)
            .slice(0, 3)
            .map((hp) => {
              const counterpart = awayStarters.find((ap) => ap.position === hp.position) ?? awayStarters[0];
              return (
                <li key={hp.id} className="flex justify-between border-b border-chalk-dim/10 py-1">
                  <span>
                    {hp.name} ({hp.position}, {hp.overall})
                  </span>
                  <span className="text-chalk-dim">vs</span>
                  <span>
                    {counterpart ? `${counterpart.name} (${counterpart.position}, ${counterpart.overall})` : '—'}
                  </span>
                </li>
              );
            })}
        </ul>
      </section>
    </div>
  );
}

function TacticCard({ title, lineup, manager }: { title: string; lineup: Lineup | null; manager: Manager | null }) {
  return (
    <div className="border border-chalk-dim/30 bg-pitch-light p-5">
      <p className="text-xs uppercase tracking-wide text-gold">{title}</p>
      {lineup ? (
        <dl className="mt-2 space-y-1 text-sm">
          <Row label="Formation" value={lineup.formation} />
          <Row label="Style" value={lineup.style ?? '—'} />
          <Row label="Defensive Line" value={lineup.defensive_line ?? '—'} />
          <Row label="Tempo" value={lineup.tempo ?? '—'} />
        </dl>
      ) : (
        <p className="mt-2 text-sm text-chalk-dim">No lineup submitted yet.</p>
      )}
      {manager && (
        <p className="mt-3 border-t border-chalk-dim/20 pt-3 text-sm text-chalk-dim">
          <span className="text-chalk">{manager.name}</span> ({manager.style}) — {manager.special_ability}
        </p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-chalk-dim">{label}</dt>
      <dd className="text-chalk">{value}</dd>
    </div>
  );
}
