export type ReservationStatus =
  | "CONFIRMED"
  | "PENDING"
  | "WAITLIST"
  | "NO_SHOW_PENDING"
  | "NO_SHOW"
  | "CANCELLED";

export type ReservationFinanceState = "PAID" | "BALANCE" | "DEPOSIT" | "NO_CAPTURE" | "ESTIMATED";

export interface ReservationFinancialSummary {
  totalAmount: number;
  /** Null cuando no existe captura (NO_CAPTURE) o aún no hay guarante monto (ESTIMATED). */
  paidAmount: number | null;
  financeState: ReservationFinanceState;
}

export interface ReservationListItem {
  id: string;
  propertyId: string;
  guestName: string;
  sourceLabel: string;
  sourceReference: string | null;
  roomLabel: string | null;
  stayStart: Date;
  stayEnd: Date;
  nights: number;
  adults: number;
  roomCount: number | null;
  currency: string;
  finance: ReservationFinancialSummary;
  alertText: string | null;
  status: ReservationStatus;
  statusDetail: string | null;
}

export interface ReservationAlertItem {
  id: string;
  kind: string;
  message: string;
}

export interface ReservationCenterSummary {
  arrivalsToday: number;
  departuresToday: number;
  vipToday: number;
  multiRoomToday: number;
  lateCheckoutToday: number;
  alerts: number;
  confirmedNextDays: number;
  decisionsRequired: number;
  total: number;
}

export interface ReservationCenterData {
  summary: ReservationCenterSummary;
  alerts: ReservationAlertItem[];
  reservations: ReservationListItem[];
}