/** Guest read projection, frontend/mock only. Not the WEB-3 write contract. */
export interface GuestReservationDTO {
  reservation_id: string;
  property_id: string;
  property_name: string;
  booking_guest: string;
  period: "CURRENT" | "PAST";
  status_code: string;
  status_label: string;
  policy: string;
  stays: {
    stay_id: string;
    room_type: string;
    arrival: string;
    departure: string;
    status_code: string;
    status_label: string;
    occupants: { guest_profile_id: string; name: string }[];
  }[];
}
export interface GuestReservationListDTO { account_id: string; reservations: GuestReservationDTO[] }
