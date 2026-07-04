import { redirect } from 'next/navigation';
import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { RegisterForm } from './register-form';

export default async function RegisterPage() {
  const profile = await requireProfile();
  if (profile.role === 'admin') redirect('/admin');
  if (profile.club_id) redirect('/club');

  const supabase = await createClient();
  const { data: clubs } = await supabase
    .from('clubs')
    .select('id, name, owner_name')
    .is('owner_name', null)
    .order('name');

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-16">
      <p className="font-stats text-xs uppercase tracking-[0.3em] text-gold">Phase 1 — Registration</p>
      <h1 className="mt-2 font-display text-4xl uppercase text-chalk">Claim Your Club</h1>
      <p className="mt-2 text-sm text-chalk-dim">
        Pick an unclaimed slot and name your club. The commissioner will activate your account once registration
        closes.
      </p>
      <RegisterForm clubs={clubs ?? []} />
    </main>
  );
}
