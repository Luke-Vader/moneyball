import { createClient } from '@/lib/supabase/server';
import { LeagueTable } from './league-table';

export default async function LeaguePage() {
  const supabase = await createClient();
  const { data: clubs } = await supabase
    .from('clubs')
    .select('*')
    .order('points', { ascending: false })
    .order('gf', { ascending: false });

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div>
        <p className="font-stats text-xs uppercase tracking-[0.3em] text-gold">League Status</p>
        <h1 className="mt-2 font-display text-4xl uppercase text-chalk">Table</h1>
      </div>
      <LeagueTable clubs={clubs ?? []} />
    </div>
  );
}
