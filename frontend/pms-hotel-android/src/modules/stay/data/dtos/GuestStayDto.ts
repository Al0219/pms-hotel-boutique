/** Confirmed Guest Backend read projection; no GuestProfile or financial data. */
export interface GuestStayDto {
  confirmationCode?: string | null;
  id: string; reservationId: string;
  roomType: { id: string; name: string };
  room: { id: string; code: string } | null;
  arrival: string; departure: string; status: string;
}
