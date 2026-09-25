export interface NoShowPreview {
  reservationId: string;
  policySummary: string;
  /** Null cuando la política no define ventana de cutoff. */
  cutoffAt: Date | null;
  /** Cargo permitido proyectado por Backend — UI lo muestra pero nunca lo inventa. */
  allowedCharge: number;
  releaseNote: string | null;
  /** El UI nunca habilita la acción si Backend no lo permite. */
  canMarkNoShow: boolean;
  reason: string | null;
}

export interface NoShowResult {
  reservationId: string;
  status: "NO_SHOW";
  markedAt: Date;
  allowedCharge: number;
  message: string;
}
