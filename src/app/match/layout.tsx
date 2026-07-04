import { requireProfile } from '@/lib/auth';

export default async function MatchLayout({ children }: { children: React.ReactNode }) {
  await requireProfile();
  return <>{children}</>;
}
