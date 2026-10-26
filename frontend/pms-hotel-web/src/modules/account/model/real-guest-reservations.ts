export const guestReservationStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED'] as const;
export const guestStayStatuses = ['RESERVED', 'IN_HOUSE', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW'] as const;
export type GuestReservationStatus = typeof guestReservationStatuses[number];
export type GuestStayStatus = typeof guestStayStatuses[number];
export interface RealGuestStay {
  readonly reservationStayId: string; readonly roomTypeId: string; readonly roomTypeName: string;
  readonly arrival: string; readonly departure: string; readonly status: GuestStayStatus;
}
export interface RealGuestReservation {
  readonly reservationId: string; readonly confirmationCode: string; readonly status: GuestReservationStatus;
  readonly propertyId: string; readonly propertyName: string; readonly propertyTimeZone: string;
  readonly bookingGuestName: string | null; readonly stays: readonly RealGuestStay[];
}
export interface RealGuestReservationPage {
  readonly guestAccountId: string; readonly page: number; readonly size: number;
  readonly totalElements: number; readonly items: readonly RealGuestReservation[];
}
export interface RealGuestReservationDetail { readonly guestAccountId: string; readonly reservation: RealGuestReservation }
export const guestReservationLabels: Record<GuestReservationStatus, string> = { PENDING: 'Pendiente', CONFIRMED: 'Confirmada', CANCELLED: 'Cancelada' };
export const guestStayLabels: Record<GuestStayStatus, string> = { RESERVED: 'Reservada', IN_HOUSE: 'En curso', CHECKED_OUT: 'Finalizada', CANCELLED: 'Cancelada', NO_SHOW: 'No presentada' };
export const guestDateLabel = (day: string) => new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(day + 'T00:00:00Z'));
export const guestStayNights = (stay: RealGuestStay) => Math.round((Date.parse(stay.departure + 'T00:00:00Z') - Date.parse(stay.arrival + 'T00:00:00Z')) / 86400000);
