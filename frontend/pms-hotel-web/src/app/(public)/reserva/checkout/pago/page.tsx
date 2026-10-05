import { readBookingPageCriteria } from '@/modules/booking';
import { PublicPaymentReviewPage } from '@/modules/checkout';

export default async function Page({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <PublicPaymentReviewPage initialCriteria={readBookingPageCriteria(await searchParams)} />;
}
