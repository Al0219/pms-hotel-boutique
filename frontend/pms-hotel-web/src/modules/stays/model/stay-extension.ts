/** Estadía actual antes de extender, tal como la conoce Backend. */
export interface StayExtensionCurrentStay {
  roomLabel: string;
  roomType: string;
  checkIn: Date;
  /** Salida vigente de la estadía. */
  checkOut: Date;
  nights: number;
}

export interface StayExtensionPreview {
  reservationId: string;
  stayId: string;
  guestName: string;
  currentStay: StayExtensionCurrentStay;
  /** Salida solicitada, revalidada por Backend. */
  requestedDeparture: Date;
  /** Noches adicionales que implica la nueva salida. */
  extraNights: number;
  /** Tarifa por noche revalidada. */
  ratePerNight: number;
  /** El UI nunca confirma la extensión si la tarifa no se valida. */
  rateConfirmed: boolean;
  rateConfirmation: string;
  /** Disponibilidad revalidada para las noches adicionales. */
  availabilityConfirmed: boolean;
  availabilityNote: string | null;
  /** Cargo adicional por las noches extras. */
  deltaAmount: number;
  /** Total resultante (original + delta). */
  newTotalAmount: number;
  currency: string;
  inventoryNote: string | null;
  calendarNote: string | null;
  /** Evidencia de que el folio y los cargos se conservan. */
  folioNote: string | null;
  /** El UI nunca habilita la acción si Backend no lo permite. */
  canExtend: boolean;
  reason: string | null;
}

export interface StayExtensionResult {
  reservationId: string;
  stayId: string;
  status: "EXTENDED";
  /** Salida anterior. */
  previousDeparture: Date;
  /** Nueva salida registrada. */
  newDeparture: Date;
  extraNights: number;
  /** Total de noches de la estadía tras la extensión. */
  nights: number;
  ratePerNight: number;
  /** Cargo adicional aplicado. */
  deltaAmount: number;
  extendedAt: Date;
  auditSummary: string;
  message: string;
}