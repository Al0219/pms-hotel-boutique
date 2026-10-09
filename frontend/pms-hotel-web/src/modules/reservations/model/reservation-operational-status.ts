import type { ReservationStatus } from './reservation-summary';
import type { ReservationStayDetail } from './reservation-detail';

/** Presentation projection only: never replaces the persisted Reservation or Stay status. */
export type ReservationOperationalStatus = 'PENDING' | 'CONFIRMED' | 'ASSIGNED' | 'IN_HOUSE' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
export type ReservationVisibleStatus = ReservationStatus | ReservationOperationalStatus;
export const reservationStatusLabels: Record<ReservationVisibleStatus, string> = {
  PENDING: 'Pendiente', CONFIRMED: 'Confirmada', ASSIGNED: 'Asignada', IN_HOUSE: 'En estancia',
  COMPLETED: 'Completada', NO_SHOW: 'No show', CANCELLED: 'Cancelada',
  WAITLIST: 'Waitlist', NO_SHOW_PENDING: 'No-show pendiente',
};
export const operationalStatusOptions: ReadonlyArray<{ value: ReservationOperationalStatus; label: string }> = [
  { value: 'PENDING', label: 'Pendientes' }, { value: 'CONFIRMED', label: 'Confirmadas' },
  { value: 'ASSIGNED', label: 'Asignadas' }, { value: 'IN_HOUSE', label: 'En estancia' },
  { value: 'COMPLETED', label: 'Completadas' }, { value: 'NO_SHOW', label: 'No show' },
  { value: 'CANCELLED', label: 'Canceladas' },
];
export function deriveReservationOperationalStatus(
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED',
  stays: ReadonlyArray<Pick<ReservationStayDetail, 'roomId' | 'travelState'>>,
): ReservationOperationalStatus {
  if (status === 'CANCELLED') return 'CANCELLED';
  // Empty historical headers retain the real parent state; no vacuous all-stays inference.
  if (!stays.length) return status;
  const relevant = stays.filter(stay => stay.travelState !== 'CANCELLED');
  if (!relevant.length) return 'CANCELLED';
  if (relevant.some(stay => stay.travelState === 'IN_HOUSE')) return 'IN_HOUSE';
  if (relevant.every(stay => stay.travelState === 'CHECKED_OUT')) return 'COMPLETED';
  if (relevant.every(stay => stay.travelState === 'NO_SHOW')) return 'NO_SHOW';
  if (status === 'PENDING') return 'PENDING';
  const reserved = relevant.filter(stay => stay.travelState === 'RESERVED');
  if (reserved.length && reserved.every(stay => stay.roomId !== null)
    && relevant.every(stay => stay.travelState === 'RESERVED' || stay.travelState === 'CHECKED_OUT')) return 'ASSIGNED';
  return 'CONFIRMED';
}
export function visibleReservationStatus(reservation: { status: ReservationStatus; operationalStatus?: ReservationOperationalStatus }): ReservationVisibleStatus {
  return reservation.operationalStatus ?? reservation.status;
}
export function reservationStatusVariant(status: ReservationVisibleStatus): 'success' | 'warning' | 'info' | 'neutral' | 'error' {
  if (status === 'PENDING') return 'warning';
  if (status === 'IN_HOUSE' || status === 'ASSIGNED' || status === 'WAITLIST') return 'info';
  if (status === 'COMPLETED' || status === 'CONFIRMED') return 'success';
  if (status === 'CANCELLED') return 'neutral';
  return 'error';
}
