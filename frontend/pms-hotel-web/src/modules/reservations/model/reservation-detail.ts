import type {
  ReservationFinancialSummary,
  ReservationStatus,
} from "./reservation-summary";

export type StayTravelState = "RESERVED" | "IN_HOUSE" | "CHECKED_OUT" | "CANCELLED" | "NO_SHOW";

/** Una estadía dentro de la Reservation. Multi-room => múltiples estadías con Stay ID propio. */
export interface ReservationStayDetail {
  id: string;
  roomId: string;
  roomLabel: string;
  roomType: string;
  checkIn: Date;
  checkOut: Date;
  nights: number;
  travelState: StayTravelState;
}

export interface ReservationGuestSummary {
  primaryName: string;
  phone: string | null;
  adults: number;
  children: number | null;
}

export interface ReservationFinanceLine {
  label: string;
  amount: number;
}

export interface ReservationDetailFinancialSummary extends ReservationFinancialSummary {
  /** Tarifa por noche del rate plan confirmado. */
  ratePerNight: number;
  /** Desglose resumido: alojamiento, impuestos, servicio. No sustituye al Folio. */
  lines: ReservationFinanceLine[];
}

export interface ReservationSource {
  label: string;
  reference: string | null;
}

export interface ReservationDetailData {
  id: string;
  propertyId: string;
  status: ReservationStatus;
  createdAt: Date;
  source: ReservationSource;
  policyLabel: string;
  guest: ReservationGuestSummary;
  stays: ReservationStayDetail[];
  notes: string | null;
  currency: string;
  finance: ReservationDetailFinancialSummary;
}