import { requireAdmin } from '@/lib/auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</div>;
}
