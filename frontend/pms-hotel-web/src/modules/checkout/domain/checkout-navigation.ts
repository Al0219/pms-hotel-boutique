import { publicGuestDataHref, type BookingSearchCriteria } from '@/modules/booking';

export const publicCheckoutReviewHref = (criteria: Partial<BookingSearchCriteria>) => publicGuestDataHref(criteria).replace('/checkout', '/checkout/revision');
export const publicPaymentHref = (criteria: Partial<BookingSearchCriteria>) => publicGuestDataHref(criteria).replace('/checkout', '/checkout/pago');
