export interface PersistedHousekeepingRequest {
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
export const housekeepingStatusLabels: Record<PersistedHousekeepingRequest['status'], string> = {
  OPEN: 'Solicitado', IN_PROGRESS: 'En proceso', DONE: 'Completado', CANCELLED: 'Cancelado',
};
