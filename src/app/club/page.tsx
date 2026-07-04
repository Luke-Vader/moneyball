import Link from 'next/link';
import { requireClubOwner } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatMoney } from '@/lib/auction/resolve-item';

export default async function ClubHomePage() {
  const profile = await requireClubOwner();
  const supabase = await createClient();

  const { data: club } = await supabase.from('clubs').select('*').eq('id', profile.club_id).single();
  const [{ data: stadium }, { data: manager }, { data: squad }, { data: fixtures }] = await Promise.all([
    club?.stadium_id
      ? supabase.from('stadiums').select('*').eq('id', club.stadium_id).single()
      : Promise.resolve({ data: null }),
    club?.manager_id
      ? supabase.from('managers').select('*').eq('id', club.manager_id).single()
      : Promise.resolve({ data: null }),
    supabase.from('players').select('*').eq('owner_club_id', profile.club_id).order('overall', { ascending: false }),
    supabase
      .from('fixtures')
      .select('*')
      .or(`home_club_id.eq.${profile.club_id},away_club_id.eq.${profile.club_id}`)
      .eq('played', false)
      .order('matchweek')
      .limit(1),
  ]);

  const nextFixture = fixtures?.[0];

  return (
    <div className="space-y-8">
      <div>
        <p className="font-stats text-xs uppercase tracking-[0.3em] text-gold">Club Dashboard</p>
        <h1 className="mt-2 font-display text-4xl uppercase text-chalk">{club?.name}</h1>
        <p className="mt-1 text-sm text-chalk-dim">Owner: {club?.owner_name}</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-4">
        <Stat label="Budget Remaining" value={formatMoney(club?.budget ?? 0)} />
        <Stat label="Cash" value={formatMoney(club?.cash ?? 0)} />
        <Stat label="League Position" value={`${club?.points ?? 0} pts`} />
        <Stat label="Record" value={`${club?.won ?? 0}W ${club?.drawn ?? 0}D ${club?.lost ?? 0}L`} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="border border-gold/30 bg-pitch-light p-5">
          <p className="text-xs uppercase tracking-wide text-gold">Stadium</p>
          {stadium ? (
            <>
              <p className="mt-1 font-display text-xl text-chalk">{stadium.name}</p>
              <p className="mt-1 text-sm text-chalk-dim">{stadium.passive_ability}</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-chalk-dim">Not yet won at auction.</p>
          )}
        </div>
        <div className="border border-gold/30 bg-pitch-light p-5">
          <p className="text-xs uppercase tracking-wide text-gold">Manager</p>
          {manager ? (
            <>
              <p className="mt-1 font-display text-xl text-chalk">{manager.name}</p>
              <p className="mt-1 text-sm text-chalk-dim">{manager.special_ability}</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-chalk-dim">Not yet won at auction.</p>
          )}
        </div>
      </section>

      {nextFixture && (
        <section className="border border-gold bg-pitch-light p-5">
          <p className="text-xs uppercase tracking-wide text-gold">Next Fixture — Matchweek {nextFixture.matchweek}</p>
          <p className="mt-1 font-display text-2xl text-chalk">
            {nextFixture.home_club_id === profile.club_id ? 'Home' : 'Away'} fixture
          </p>
          <Link href="/club/lineup" className="mt-3 inline-block text-sm text-gold underline underline-offset-4">
            Submit your lineup →
          </Link>
        </section>
      )}

      <section>
        <p className="text-xs uppercase tracking-wide text-chalk-dim">Squad ({squad?.length ?? 0})</p>
        <div className="mt-3 overflow-x-auto border border-chalk-dim/20">
          <table className="stat-table w-full text-sm">
            <thead className="bg-pitch-light text-left text-xs uppercase tracking-wide text-chalk-dim">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Pos</th>
                <th className="px-4 py-2">OVR</th>
                <th className="px-4 py-2">Fitness</th>
                <th className="px-4 py-2">Morale</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(squad ?? []).map((p) => (
                <tr key={p.id} className="border-t border-chalk-dim/10">
                  <td className="px-4 py-2 text-chalk">{p.name}</td>
                  <td className="px-4 py-2 text-chalk-dim">{p.position}</td>
                  <td className="px-4 py-2 text-chalk">{p.overall}</td>
                  <td className="px-4 py-2 text-chalk-dim">{p.fitness}%</td>
                  <td className="px-4 py-2 text-chalk-dim">{p.morale}%</td>
                  <td className="px-4 py-2">
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
      <p className="mt-1 font-stats text-xl text-chalk">{value}</p>
    </div>
  );
}
