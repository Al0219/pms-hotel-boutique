import { readBookingPageCriteria } from '@/modules/booking';
import { PublicCheckoutReviewPage } from '@/modules/checkout';

export default async function Page({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <PublicCheckoutReviewPage initialCriteria={readBookingPageCriteria(await searchParams)} />;
}
