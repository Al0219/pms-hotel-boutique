export interface ReservationAccessRequest {
  reservationCode: string;
  email: string;
}

/** Minimal outcome for the frontend mock link flow; it is not a backend API contract. */
export interface ReservationAccessResult {
  linked: true;
  reservationId: string;
  reservationStayId: string;
}
