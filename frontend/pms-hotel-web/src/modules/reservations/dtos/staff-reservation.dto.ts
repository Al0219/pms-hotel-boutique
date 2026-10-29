/** Staff read contract: backend/docs/49_STAFF_RESERVATIONS_READ_CONTRACT.md. */
export interface StaffReservationDto {
  reservationId: string;
  propertyId: string;
  confirmationCode: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  source: string | null;
  sourceReference: string | null;
  currency: string;
  createdAt: string;
  /** Additive detail-only contract64. Absent from list and older backend versions. */
  details?: {
    updatedAt: string;
    notes: string | null;
    contact: { profileId: string; email: string | null; phone: string | null; documentType: string | null;
      documentNumberMasked: string | null; preferredLanguage: string | null; country?: string | null } | null;
    stays: Array<{ stayId: string; occupants: Array<{ profileId: string; fullName: string; primary: boolean }> }>;
  };
  responsibleGuest: { profileId: string; firstName: string; lastName: string } | null;
  stays: Array<{
    stayId: string;
    updatedAt: string;
    arrival: string;
    departure: string;
    status: 'RESERVED' | 'IN_HOUSE' | 'CHECKED_OUT' | 'CANCELLED' | 'NO_SHOW';
    roomType: { roomTypeId: string; code: string; name: string };
    room: { roomId: string; code: string } | null;
  }>;
}
