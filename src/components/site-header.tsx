import Link from 'next/link';
import { getCurrentProfile } from '@/lib/auth';
import { SignOutButton } from './sign-out-button';

export async function SiteHeader() {
  const profile = await getCurrentProfile();

  const adminLinks = [
    ['/admin', 'Dashboard'],
    ['/admin/registrations', 'Registrations'],
    ['/admin/auction', 'Auction'],
    ['/admin/fixtures', 'Fixtures'],
    ['/admin/settings', 'Settings'],
    ['/admin/history', 'History'],
    ['/league', 'League'],
    ['/finance', 'Finance'],
  ];
  const ownerLinks = [
    ['/club', 'My Club'],
    ['/club/lineup', 'Lineup'],
    ['/auction', 'Auction'],
    ['/league', 'League'],
    ['/finance', 'Finance'],
  ];

  const links = profile?.role === 'admin' ? adminLinks : profile?.role === 'club_owner' ? ownerLinks : [];

  return (
    <header className="border-b border-gold/20 bg-pitch-dark">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-display text-xl uppercase tracking-wide text-chalk">
            Moneyball <span className="text-gold">Alpha</span>
          </Link>
          {profile ? (
            <span className="sm:hidden">
              <SignOutButton />
            </span>
          ) : (
            <Link href="/login" className="font-stats text-xs uppercase tracking-wide text-gold sm:hidden">
              Sign in
            </Link>
          )}
        </div>
        <nav className="flex items-center gap-4 overflow-x-auto whitespace-nowrap pb-1 sm:gap-5 sm:pb-0">
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="font-stats text-xs uppercase tracking-wide text-chalk-dim transition hover:text-gold"
            >
              {label}
            </Link>
          ))}
          {profile ? (
            <span className="hidden sm:inline">
              <SignOutButton />
            </span>
          ) : (
            <Link href="/login" className="hidden font-stats text-xs uppercase tracking-wide text-gold sm:inline">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
