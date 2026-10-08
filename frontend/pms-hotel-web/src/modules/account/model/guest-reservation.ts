export interface GuestReservation {
  id: string;
  propertyId: string;
  propertyName: string;
  bookingGuest: string;
  period: "CURRENT" | "PAST";
  statusCode: string;
  statusLabel: string;
  policy: string;
  stays: {
    id: string;
    roomType: string;
    arrival: string;
    departure: string;
    statusCode: string;
    statusLabel: string;
    occupants: { profileId: string; name: string }[];
  }[];
}
