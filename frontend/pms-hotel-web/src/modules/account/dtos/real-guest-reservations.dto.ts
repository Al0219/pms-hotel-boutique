/** Confirmed Guest read contract; identity is supplied by the server, never the browser. */
export interface RealGuestStayDTO {
  reservationStayId: string; roomTypeId: string; roomTypeName: string;
  arrival: string; departure: string; status: string;
}
export interface RealGuestReservationDTO {
  reservationId: string; confirmationCode: string; status: string; propertyId: string;
  propertyName: string; propertyTimeZone: string; bookingGuestName: string | null; stays: RealGuestStayDTO[];
}
export interface RealGuestReservationPageDTO {
  guestAccountId: string; page: number; size: number; totalElements: number; items: RealGuestReservationDTO[];
}
export interface RealGuestReservationDetailDTO { guestAccountId: string; reservation: RealGuestReservationDTO }
export interface RealReservationLinkChallengeDTO { requestId: string }
