import type { BookingSearchCriteria } from './booking-search-criteria';

/** Keep supplied criteria, including invalid ones, editable instead of replacing them. */
export function publicResultsHref(criteria: Partial<BookingSearchCriteria>): string {
  const query = new URLSearchParams();
  for (const key of ['checkIn', 'checkOut', 'adults', 'children', 'roomsCount', 'promoCode'] as const) {
    const value = criteria[key];
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  return `/habitaciones${query.size ? `?${query}` : ''}`;
}

export function publicRoomHref(roomTypeId: string, criteria: Partial<BookingSearchCriteria>, ratePlanId?: string): string {
  const base = publicResultsHref(criteria);
  const query = new URLSearchParams(base.split('?')[1]);
  if (ratePlanId) query.set('ratePlanId', ratePlanId);
  return `/habitaciones/${encodeURIComponent(roomTypeId)}${query.size ? `?${query}` : ''}`;
}
