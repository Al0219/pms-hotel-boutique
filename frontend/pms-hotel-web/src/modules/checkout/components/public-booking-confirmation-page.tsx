import type { BookingSearchCriteria } from '@/modules/booking';
import { PublicBookingResultPage } from './public-booking-result-page';

export function PublicBookingConfirmationPage({ initialCriteria }: { initialCriteria: Partial<BookingSearchCriteria> }) {
  return <PublicBookingResultPage initialCriteria={initialCriteria} status="success" />;
}
