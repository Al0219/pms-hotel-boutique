import { readBookingPageCriteria } from '@/modules/booking';
import { PublicBookingResultPage } from '@/modules/checkout';

export default async function Page({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <PublicBookingResultPage initialCriteria={readBookingPageCriteria(await searchParams)} status="error" />;
}
