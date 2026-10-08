/** Identifies, but never copies, the ReservationStay currently used by Guest. */
export interface ActiveReservationContext {
  reservationId: string;
  reservationStayId: string;
}
