export interface CancellationPreview {
  reservationId: string;
  policySummary: string;
  /** Null cuando la política no define ventana de cutoff. */
  cutoffAt: Date | null;
  penaltyAmount: number;
  refundAmount: number;
  releaseNote: string | null;
  /** El UI nunca habilita la cancelación si Backend no lo permite. */
  canCancel: boolean;
  reason: string | null;
}

export interface CancellationResult {
  reservationId: string;
  status: "CANCELLED";
  cancelledAt: Date;
  penaltyAmount: number;
  refundAmount: number;
  message: string;
}