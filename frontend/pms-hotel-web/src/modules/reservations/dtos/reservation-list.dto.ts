/**
 * PROVISIONAL API CONTRACT
 * Debe validarse contra Backend antes de marcar CONFIRMED.
 * Contrato del Reservation Center (V3 - 01 Reservation Engine).
 */

export type ReservationStatusDto = "CONFIRMED" | "PENDING" | "WAITLIST" | "NO_SHOW_PENDING" | "NO_SHOW" | "CANCELLED";

export type ReservationFinanceStateDto = "PAID" | "BALANCE" | "DEPOSIT" | "NO_CAPTURE" | "ESTIMATED";

/**
 * Resumen financiero por reserva. Amounts llegan como string numérico.
 * NO_CAPTURE indica que aún no existe captura de garantía; ESTIMATED es propio de waitlist.
 */
export interface ReservationListItemDto {
  reservation_id: string;
  property_id: string;
  guest_name: string;
  /** Canal u origen comercial: "Viajes Maya", "Booking", "Web directa", "Expedia". */
  source_label: string;
  /** Referencia comercial opcional: voucher, folio de agencia, booking ID. */
  source_reference: string | null;
  /** Habitación asignada ("203") o tipo ("Deluxe King") cuando no hay asignación. */
  room_label: string | null;
  /** Fechas ISO "YYYY-MM-DD". */
  stay_start: string;
  stay_end: string;
  nights: number;
  adults: number;
  /** Null en solicitudes de waitlist (aún sin habitación confirmada). */
  room_count: number | null;
  currency: string;
  total_amount: string;
  paid_amount: string | null;
  finance_state: ReservationFinanceStateDto;
  /** Alerta puntual de la reserva, ej. "Garantía vence hoy 20:00". "Sin alertas" si no aplica. */
  alert_text: string | null;
  status: ReservationStatusDto;
  /** Detalle de estado, ej. "Check-in 28 ago · 15:00". */
  status_detail: string | null;
}

export interface ReservationAlertItemDto {
  alert_id: string;
  /** Clasificación libre para el indicador visual, ej. "NO_SHOW_PENDING". */
  kind: string;
  message: string;
}

export interface ReservationCenterSummaryDto {
  arrivals_today: number;
  departures_today: number;
  vip_today: number;
  multi_room_today: number;
  late_checkout_today: number;
  alerts: number;
  confirmed_next_days: number;
  decisions_required: number;
  /** Total de reservas visibles para la propiedad (para paginación). */
  total: number;
}

export interface ReservationCenterDto {
  summary: ReservationCenterSummaryDto;
  alerts: ReservationAlertItemDto[];
  reservations: ReservationListItemDto[];
}