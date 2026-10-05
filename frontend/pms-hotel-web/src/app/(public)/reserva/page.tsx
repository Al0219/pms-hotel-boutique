import { PublicBookingReviewPage, readBookingPageCriteria } from '@/modules/booking';

export default async function Page({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <PublicBookingReviewPage initialCriteria={readBookingPageCriteria(await searchParams)} />;
}
