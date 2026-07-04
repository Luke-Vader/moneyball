import { createClient } from '@/lib/supabase/server';
import { AssignForm } from './assign-form';

export default async function RegistrationsPage() {
  const supabase = await createClient();
  const [{ data: clubs }, { data: profiles }] = await Promise.all([
    supabase.from('clubs').select('id, name, owner_name').order('name'),
    supabase.from('profiles').select('id, email, role, club_id').order('email'),
  ]);

  const clubById = new Map((clubs ?? []).map((c) => [c.id, c]));
  const unassignedOwners = (profiles ?? []).filter((p) => p.role === 'club_owner' && !p.club_id);

  return (
    <div className="space-y-8">
      <div>
        <p className="font-stats text-xs uppercase tracking-[0.3em] text-gold">Phase 1</p>
        <h1 className="mt-2 font-display text-4xl uppercase text-chalk">Registrations</h1>
        <p className="mt-2 text-sm text-chalk-dim">
          Club owners claim a name via /register. Link each claimed club to the login it belongs to below.
        </p>
      </div>

      <div className="overflow-x-auto border border-gold/30">
        <table className="w-full stat-table text-sm">
          <thead className="bg-pitch-light text-left text-xs uppercase tracking-wide text-chalk-dim">
            <tr>
              <th className="px-4 py-3">Club</th>
              <th className="px-4 py-3">Owner Name</th>
              <th className="px-4 py-3">Linked Login</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {(clubs ?? []).map((club) => {
              const linkedProfile = (profiles ?? []).find((p) => p.club_id === club.id);
              return (
                <tr key={club.id} className="border-t border-chalk-dim/20">
                  <td className="px-4 py-3 text-chalk">{club.name}</td>
                  <td className="px-4 py-3 text-chalk-dim">{club.owner_name ?? '—'}</td>
                  <td className="px-4 py-3 text-chalk-dim">{linkedProfile?.email ?? 'Not linked'}</td>
                  <td className="px-4 py-3">
                    {!linkedProfile && club.owner_name && (
                      <AssignForm clubId={club.id} candidates={unassignedOwners} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {clubById.size > 0 && unassignedOwners.length === 0 && (
        <p className="text-sm text-chalk-dim">
          No unlinked club-owner logins waiting. Ask remaining owners to sign in at /login first — a profile is
          created automatically on first sign-in.
        </p>
      )}
    </div>
  );
}
