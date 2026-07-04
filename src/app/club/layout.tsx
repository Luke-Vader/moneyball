import { requireClubOwner } from '@/lib/auth';

export default async function ClubLayout({ children }: { children: React.ReactNode }) {
  await requireClubOwner();
  return <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</div>;
}
