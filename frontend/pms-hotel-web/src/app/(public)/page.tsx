import { PublicBookingHome, readBookingPageCriteria } from '@/modules/booking';

export default async function PublicPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const criteria = readBookingPageCriteria(await searchParams);
  return <PublicBookingHome initialCriteria={criteria} />;
}
