export interface GuestCleaningRequestDto {
  id: string; propertyId: string; confirmationCode: string; roomCode: string | null;
  serviceDate: string; timeSlot: string; cleaningType: string; notes: string | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
}
