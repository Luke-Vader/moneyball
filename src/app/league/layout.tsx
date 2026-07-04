import { requireProfile } from '@/lib/auth';

export default async function LeagueLayout({ children }: { children: React.ReactNode }) {
  await requireProfile();
  return <>{children}</>;
}
