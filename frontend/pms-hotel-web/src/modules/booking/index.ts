/**
 * Public API for the booking module.
 * Export only intentionally public Domain Models, hooks and components.
 * Do not expose DTOs, mappers or service internals without an approved reason.
 */
export { MyReservationsPage } from "./components/my-reservations-page";
export { PublicSearchForm } from './ui/public-search-form';
export { PublicBookingHome } from './ui/public-booking-home';
export { PublicBookingShell } from './ui/public-booking-shell';
export { PublicAvailabilityPage } from './ui/public-availability-page';
export { PublicBookingProvider } from './components/public-booking-provider';
export { PublicRoomDetailPage } from './ui/public-room-detail-page';
export { PublicBookingReviewPage } from './ui/public-booking-review-page';
export { BookingStepper } from './ui/booking-stepper';
export { usePublicBookingReview } from './hooks/use-public-booking-review';
export { publicResultsHref, publicSelectionHref, publicGuestDataHref } from './domain/public-room-navigation';
export { PublicCurrencySelector } from './ui/public-currency-selector';
export { usePublicDisplayCurrency } from './components/public-booking-provider';
export { useResetPublicBooking } from './components/public-booking-provider';
export { displayMoney } from './domain/display-currency';
export { resolveSelection } from './domain/room-catalogue';
export { selectionPriceSummary } from './domain/selection-price-summary';
export type { PublicSearchFormProps } from './ui/public-search-form';

export {
  validateBookingSearchCriteria,
  buildSearchQueryParams,
  getBookingCalendarDate,
  isBookingCalendarDate,
  nextBookingCalendarDate,
  readBookingSearchCriteria,
  readBookingPageCriteria,
} from './domain/booking-search-criteria';
export type {
  BookingSearchCriteria,
  BookingSearchValidationErrors,
} from './domain/booking-search-criteria';
