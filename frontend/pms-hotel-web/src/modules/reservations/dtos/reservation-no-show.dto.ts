/**
 * PROVISIONAL API CONTRACT
 * Debe validarse contra Backend antes de marcar CONFIRMED.
 * Contrato del flujo de no-show (V3 - 01 Reservation Engine, No-show).
 */

/** Proyección de la política antes de confirmar el no-show. */
export interface NoShowPreviewDto {
  reservation_id: string;
  /** Política aplicable, ej. "No-show: cargo de una noche + impuestos." */
  policy_summary: string;
  /** ISO datetime del cutoff; null cuando la política no define ventana. */
  cutoff_at: string | null;
  /** Cargo permitido proyectado como string numérico ("0" si no aplica). */
  allowed_charge: string;
  /** Nota de liberación de inventario, ej. "Estándar Doble 101 · 27–29 ago." */
  release_note: string | null;
  /** Decisión de Backend: solo se habilita la acción si es true. */
  can_mark_no_show: boolean;
  /** Motivo de rechazo cuando can_mark_no_show=false, ej. "Reserva ya cancelada." */
  reason: string | null;
}

/** Resultado del no-show confirmado. */
export interface NoShowApplyDto {
  reservation_id: string;
  status: "NO_SHOW";
  /** ISO datetime. */
  marked_at: string;
  allowed_charge: string;
  /** Evidencia de auditoría, ej. "No-show: cargo Q470 · ATS +1/noche." */
  message: string;
}
