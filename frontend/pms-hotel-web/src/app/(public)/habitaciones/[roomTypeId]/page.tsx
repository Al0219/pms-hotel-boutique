import { PublicRoomDetailPage, readBookingPageCriteria } from '@/modules/booking';

export default async function Page({ params, searchParams }: {
  params: Promise<{ roomTypeId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [route, query] = await Promise.all([params, searchParams]);
  return <PublicRoomDetailPage roomTypeId={route.roomTypeId} initialCriteria={readBookingPageCriteria(query)}
    initialRatePlanId={Array.isArray(query.ratePlanId) ? 'INVALID_RATE_SELECTION' : query.ratePlanId} />;
}
