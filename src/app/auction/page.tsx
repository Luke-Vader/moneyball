import { requireProfile } from '@/lib/auth';
import { AuctionRoom } from '@/components/auction/auction-room';

export default async function AuctionPage() {
  const profile = await requireProfile();
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <AuctionRoom isAdmin={profile.role === 'admin'} myClubId={profile.club_id} />
    </main>
  );
}
