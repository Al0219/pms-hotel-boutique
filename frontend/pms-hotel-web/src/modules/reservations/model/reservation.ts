import { GuestProfile } from "../../profile/model/guest-profile";

/**
 * Domain Models for Reservation and ReservationStay
 * Reglas de dominio:
 * - Reservation 1:N ReservationStay.
 * - ReservationStay se liga a RoomType (producto) y opcionalmente a Room (físico).
 * - Occupants se asignan por stay, no por reserva general.
 */

export type ReservationStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "WAITLIST";
export type StayStatus = "RESERVED" | "IN_HOUSE" | "CHECKED_OUT" | "NO_SHOW" | "CANCELLED";

export interface StayOccupant {
  profileId: string;
  isPrimary: boolean;
  profileDetails?: GuestProfile;
}

export interface ReservationStay {
  stayId: string;
  reservationId: string;
  roomTypeId: string;
  roomId: string | null; // Nullable until assigned
  ratePlanId: string;
  arrivalDate: Date;
  departureDate: Date;
  status: StayStatus;
  occupants: StayOccupant[];
}

export interface Reservation {
  reservationId: string;
  propertyId: string;
  bookingGuestId: string; // Quién hizo la reserva
  status: ReservationStatus;
  channel: string;
  createdAt: Date;
  updatedAt: Date;
  stays: ReservationStay[]; // Relación 1:N garantizada
}
