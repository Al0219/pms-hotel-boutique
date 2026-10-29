import type { LinkedGuestReservation, GuestStay } from './linked-guest-reservation';

export interface LookupAccommodation extends GuestStay {
  roomTypeCode: string;
  timezone: string;
  images: string[];
  description: string | null;
}
export interface ReservationLookup {
  reservation: LinkedGuestReservation;
  details: GuestStay[];
  overview: { createdAt: string; source: string | null; currency: string; confirmedTotalMinor: number | null };
  accommodations: LookupAccommodation[];
}
