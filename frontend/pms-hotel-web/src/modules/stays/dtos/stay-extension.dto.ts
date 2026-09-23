/**
 * PROVISIONAL API CONTRACT
 * Debe validarse contra Backend antes de marcar CONFIRMED.
 * Contrato del flujo de extensión de estadía (V3 - 01 Reservation Engine, Stay Extension).
 * El preview recibe la nueva fecha de salida para revalidar disponibilidad y tarifa;
 * el apply revalida nuevamente al confirmar (Backend es la única fuente de verdad).
 * Fechas de día viajan como "YYYY-MM-DD"; extended_at viaja como ISO datetime.
 */

/** Estadía actual antes de extender, tal como la conoce Backend. */
export interface StayExtensionCurrentStayDto {
  room_label: string;
  room_type: string;
  /** YYYY-MM-DD */
  check_in: string;
  /** YYYY-MM-DD: salida vigente de la estadía. */
  check_out: string;
  nights: number;
}

/** Proyección de la extensión antes de confirmar. */
export interface StayExtensionPreviewDto {
  reservation_id: string;
  stay_id: string;
  guest_name: string;
  current_stay: StayExtensionCurrentStayDto;
  /** YYYY-MM-DD: salida solicitada, revalidada por Backend. */
  requested_departure: string;
  /** Noches adicionales que implica la nueva salida. */
  extra_nights: number;
  /** Tarifa por noche revalidada, ej. "1160". */
  rate_per_night: string;
  /** Decisión de Backend: solo se confirma la extensión si la tarifa se valida. */
  rate_confirmed: boolean;
  /** Confirmación legible de la tarifa, ej. "Tarifa Deluxe King · 1,160 GTQ/noche confirmada". */
  rate_confirmation: string;
  /** Decisión de Backend: disponibilidad revalidada para las noches adicionales. */
  availability_confirmed: boolean;
  /** Nota de disponibilidad, ej. "Deluxe King 203 disponible · 31 ago – 2 sep". */
  availability_note: string | null;
  /** Cargo adicional por las noches extras, ej. "2320". */
  delta_amount: string;
  /** Total resultante (original + delta), ej. "5800". */
  new_total_amount: string;
  currency: string;
  /** Impacto de inventario, ej. "ReservationStay A · 28 ago → 2 sep · ATS -2/noche". */
  inventory_note: string | null;
  /** Impacto de calendario, ej. "Calendario: 203 reservada hasta 2 sep". */
  calendar_note: string | null;
  /** Evidencia de que el folio y los cargos se conservan. */
  folio_note: string | null;
  /** Decisión de Backend: solo se habilita la acción si es true. */
  can_extend: boolean;
  /** Motivo de rechazo cuando can_extend=false. */
  reason: string | null;
}

/** Resultado de la extensión confirmada. */
export interface StayExtensionApplyDto {
  reservation_id: string;
  stay_id: string;
  status: "EXTENDED";
  /** YYYY-MM-DD: salida anterior. */
  previous_departure: string;
  /** YYYY-MM-DD: nueva salida registrada. */
  new_departure: string;
  extra_nights: number;
  /** Total de noches de la estadía tras la extensión. */
  nights: number;
  /** Tarifa por noche validada, ej. "1160". */
  rate_per_night: string;
  /** Cargo adicional aplicado, ej. "2320". */
  delta_amount: string;
  /** ISO datetime. */
  extended_at: string;
  /** Evidencia de auditoría, ej. "EXTENDED 31 ago → 2 sep · ReservationStay actualizado". */
  audit_summary: string;
  message: string;
}