export interface HousekeepingRequestDto {
  id: string;
  reservationId: string;
  stayId: string;
  serviceDate: string;
  timeSlot: string;
  cleaningType: string;
  notes: string | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  createdAt: string;
}
