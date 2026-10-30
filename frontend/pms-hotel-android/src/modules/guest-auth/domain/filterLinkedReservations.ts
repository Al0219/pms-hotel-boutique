import type {LinkedReservationSummary} from './models/LinkedReservationSummary';

export type StayFilter = 'CURRENT' | 'IN_HOUSE' | 'RESERVED' | 'HISTORY';
export const isCurrentStay = (stay: LinkedReservationSummary) => stay.statusLabel === 'IN_HOUSE' || stay.statusLabel === 'RESERVED';
export function validFilterDate(value: string): boolean {
  return !value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value);
}
const normalize = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
function searchableDate(value: string): string {
  const [year, month, day] = value.split('-');
  return `${value} ${day}/${month}/${year} ${day}/${month} ${day}-${month}-${year}`;
}
/** Filters only the account-scoped list supplied by the linked-reservations boundary. */
export function filterLinkedReservations(rows: readonly LinkedReservationSummary[], filter: StayFilter = 'CURRENT', search = '', from = '', to = ''): LinkedReservationSummary[] {
  if (!validFilterDate(from) || !validFilterDate(to) || (from && to && from > to)) return [];
  const query = normalize(search);
  return rows.filter(row => {
    if (filter === 'CURRENT' ? !isCurrentStay(row) : filter === 'HISTORY' ? !['CHECKED_OUT', 'CANCELLED', 'NO_SHOW'].includes(row.statusLabel ?? '') : row.statusLabel !== filter) return false;
    // Inclusive overlap with the selected stay date range.
    if ((from && row.departure < from) || (to && row.arrival > to)) return false;
    return !query || normalize(`${row.propertyLabel ?? ''} ${row.reference} ${searchableDate(row.arrival)} ${searchableDate(row.departure)}`).includes(query);
  }).sort((a, b) => {
    const rank = (row: LinkedReservationSummary) => row.statusLabel === 'IN_HOUSE' ? 0 : row.statusLabel === 'RESERVED' ? 1 : 2;
    return rank(a) - rank(b) || a.arrival.localeCompare(b.arrival) || a.departure.localeCompare(b.departure) || a.reservationStayId.localeCompare(b.reservationStayId);
  });
}
