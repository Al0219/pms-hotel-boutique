/**
 * Safe selection projection for a linked reservation/stay pair. It is not a
 * ReservationStay replacement and deliberately has no service or finance data.
 */
export interface LinkedReservationSummary {
  reservationId: string;
  reservationStayId: string;
  reference: string;
  propertyLabel?: string;
  arrival: string;
  departure: string;
  roomLabel?: string | null;
  statusLabel?: string;
}
