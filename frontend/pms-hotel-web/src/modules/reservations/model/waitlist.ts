export interface WaitlistAvailability {
  roomType: string;
  availableFrom: Date;
  availableUntil: Date;
  ratePlan: string;
  ratePerNight: number;
  totalEstimated: number;
  note: string | null;
}

export interface WaitlistConversionPreview {
  id: string;
  guestName: string;
  sourceLabel: string;
  roomTypeLabel: string;
  checkIn: Date;
  checkOut: Date;
  nights: number;
  adults: number;
  priority: number;
  queueLabel: string;
  preferences: string | null;
  originalEstimatedAmount: number;
  /** Null cuando la revalidación no encontró disponibilidad: la conversión NO puede ejecutarse. */
  availability: WaitlistAvailability | null;
}

export interface WaitlistConversionResult {
  waitlistId: string;
  reservationId: string;
  status: "CONVERTED";
  message: string;
}