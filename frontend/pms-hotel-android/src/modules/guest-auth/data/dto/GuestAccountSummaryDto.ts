export interface GuestAccountSummaryDto {
  guestAccountId: string;
  email: string;
  active: boolean;
  profiles: readonly { profileId: string; firstName: string; lastName: string; preferredLanguage: string | null; status: string }[];
  linkedReservationsCount: number;
}
export interface GuestLinkedStayDto {
  reservationId: string;
  stayId: string;
  confirmationCode: string;
  propertyName: string;
  arrival: string;
  departure: string;
  roomCode: string | null;
  status: string;
}
