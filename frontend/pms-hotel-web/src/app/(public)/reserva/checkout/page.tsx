import { readBookingPageCriteria } from '@/modules/booking';
import { PublicGuestDataPage } from '@/modules/checkout';

export default async function Page({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <PublicGuestDataPage initialCriteria={readBookingPageCriteria(await searchParams)} />;
}
