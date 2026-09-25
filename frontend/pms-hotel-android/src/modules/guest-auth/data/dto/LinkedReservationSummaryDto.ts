/** Remote-shaped frontend mock data; it is not an API contract. */
export interface LinkedReservationSummaryDto {
  reservationId: string;
  reservationStayId: string;
  reference: string;
  propertyLabel?: string;
  arrival: string;
  departure: string;
  roomLabel?: string | null;
  statusLabel?: string;
}
