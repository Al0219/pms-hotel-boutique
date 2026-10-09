import type { StayTravelState } from './reservation-detail';

/** Public domain read capability for composed operational views. No DTOs or financial fields. */
export interface StaffReservationStayRead {
  propertyId: string; reservationId: string; stayId: string;
  confirmationCode: string;
  reservationStatus: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  roomId: string | null; guestName: string | null; roomType: string;
  arrival: string; departure: string; travelState: StayTravelState;
}
