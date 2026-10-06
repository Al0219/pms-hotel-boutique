import { readBookingPageCriteria } from '@/modules/booking';
import { PublicBookingConfirmationPage } from '@/modules/checkout';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <PublicBookingConfirmationPage initialCriteria={readBookingPageCriteria(await searchParams)} />;
}
