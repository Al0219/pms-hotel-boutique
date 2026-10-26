export interface GuestCleaningRequest {
  id: string; propertyId: string; reference: string; roomLabel: string | null;
  serviceDate: string; timeSlot: string; serviceLabel: string; notes: string | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
}
export const guestCleaningStatusLabels: Record<GuestCleaningRequest['status'], string> = {
  OPEN: 'Solicitado', IN_PROGRESS: 'En proceso', DONE: 'Completado', CANCELLED: 'Cancelado',
};
