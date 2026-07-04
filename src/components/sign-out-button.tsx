'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
      }}
      className="font-stats text-xs uppercase tracking-wide text-chalk-dim hover:text-gold"
    >
      Sign out
    </button>
  );
}
