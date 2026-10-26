/** Confirmed Backend Guest read projection. Account identity is exclusively server-side. */
export interface LinkedGuestStayDTO {
  reservationId: string; stayId: string; confirmationCode: string; propertyName: string;
  reservationStatus: string; arrival: string; departure: string; roomCode: string | null; status: string;
}
export interface GuestStayDTO {
  id: string; reservationId: string; roomType: { id: string; name: string };
  room: { id: string; code: string } | null; arrival: string; departure: string; status: string;
}
