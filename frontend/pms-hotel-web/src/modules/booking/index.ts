/**
 * Public API for the booking module.
 * Export only intentionally public Domain Models, hooks and components.
 * Do not expose DTOs, mappers or service internals without an approved reason.
 */
export { MyReservationsPage } from "./components/my-reservations-page";
export { PublicSearchForm } from './ui/public-search-form';
export type { PublicSearchFormProps } from './ui/public-search-form';

export {
  validateBookingSearchCriteria,
  buildSearchQueryParams,
} from './domain/booking-search-criteria';
export type {
  BookingSearchCriteria,
  BookingSearchValidationErrors,
} from './domain/booking-search-criteria';
