/**
 * PROVISIONAL API CONTRACT
 * Debe validarse contra Backend antes de marcar CONFIRMED.
 * Contrato del flujo de cancelación (V3 - 01 Reservation Engine, Cancellation).
 */

/** Proyección de la política de cancelación antes de confirmar. */
export interface CancellationPreviewDto {
  reservation_id: string;
  /** Política aplicable, ej. "Flexible 48h · Viajes Maya: hasta 48h antes cancelación gratuita." */
  policy_summary: string;
  /** ISO datetime del cutoff de la política; null cuando la política no define ventana. */
  cutoff_at: string | null;
  /** Penalización proyectada como string numérico ("0" si no aplica). */
  penalty_amount: string;
  /** Reembolso proyectado como string numérico. */
  refund_amount: string;
  /** Nota de liberación de inventario, ej. "Deluxe King 203 · 28–31 ago." */
  release_note: string | null;
  /** Decisión de Backend: solo se habilita la cancelación si es true. */
  can_cancel: boolean;
  /** Motivo de rechazo cuando can_cancel=false, ej. "Fuera de ventana: penalización 100%." */
  reason: string | null;
}

/** Resultado de la cancelación confirmada. */
export interface CancellationApplyDto {
  reservation_id: string;
  status: "CANCELLED";
  /** ISO datetime. */
  cancelled_at: string;
  penalty_amount: string;
  refund_amount: string;
  /** Evidencia de auditoría, ej. "Penalty Charge Q1,160 · Refund Q 0 · ATS +1/noche." */
  message: string;
}