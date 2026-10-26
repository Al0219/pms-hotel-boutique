export interface LinkedGuestReservation {
  id: string; reference: string; propertyName: string; status: string;
  stays: { id: string; arrival: string; departure: string; roomCode: string | null; status: string }[];
}
export interface GuestStay {
  id: string; reservationId: string; roomType: { id: string; name: string };
  room: { id: string; code: string } | null; arrival: string; departure: string; status: string;
}
