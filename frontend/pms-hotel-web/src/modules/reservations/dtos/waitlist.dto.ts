/**
 * PROVISIONAL API CONTRACT
 * Debe validarse contra Backend antes de marcar CONFIRMED.
 * Contrato del flujo Waitlist y conversión (V3 - 01 Reservation Engine, Waitlist).
 */

/** Disponibilidad y tarifa revalidadas para las fechas de la solicitud. */
export interface WaitlistAvailabilityDto {
  room_type: string;
  /** Fechas ISO "YYYY-MM-DD" del rango disponible. */
  available_from: string;
  available_until: string;
  /** Rate plan propuesto, ej. "BAR Flexible". */
  rate_plan: string;
  /** Amounts como string numérico. */
  rate_per_night: string;
  total_estimated: string;
  /** Ej. "2 noches · impuestos/servicio según rate plan". */
  note: string | null;
}

/** Contexto completo de la solicitud wailist + resultado de la revalidación. */
export interface WaitlistConversionPreviewDto {
  waitlist_id: string;
  guest_name: string;
  source_label: string;
  room_type_label: string;
  /** Fechas ISO "YYYY-MM-DD" originales de la solicitud. */
  check_in: string;
  check_out: string;
  nights: number;
  adults: number;
  /** Posición en cola, ej. 1 de "3 solicitudes en cola". */
  priority: number;
  /** Ej. "3 solicitudes en cola". */
  queue_label: string;
  /** Preferencias conservadas, ej. "Habitación tranquila · piso alto". */
  preferences: string | null;
  original_estimated_amount: string;
  /** Null cuando la revalidación no encontró disponibilidad para las fechas. */
  availability: WaitlistAvailabilityDto | null;
}

/** Resultado de la conversión confirmada. */
export interface WaitlistConversionResultDto {
  waitlist_id: string;
  /** Nueva Reservation creada, ej. "HB-2026-09128". */
  reservation_id: string;
  /** Solo éxito si Backend confirma el estado CONVERTED. */
  status: "CONVERTED";
  message: string;
}