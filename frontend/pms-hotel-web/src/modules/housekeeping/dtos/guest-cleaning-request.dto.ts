export interface GuestCleaningRequestDto {
  id: string; propertyId: string; confirmationCode: string; roomCode: string | null;
  serviceDate: string; timeSlot: string; cleaningType: string; notes: string | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'; updatedAt: string;
}

export interface HousekeepingTransitionDto {
  id: string; propertyId: string; status: 'IN_PROGRESS' | 'DONE'; updatedAt: string;
}
