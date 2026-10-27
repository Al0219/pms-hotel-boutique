export interface GuestCleaningRequest {
  id: string; propertyId: string; reference: string; roomLabel: string | null;
  serviceDate: string; timeSlot: string; serviceLabel: string; notes: string | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'; updatedAt: string;
}
export const guestCleaningStatusLabels: Record<GuestCleaningRequest['status'], string> = {
  OPEN: 'Solicitado', IN_PROGRESS: 'En proceso', DONE: 'Completado', CANCELLED: 'Cancelado',
};

export type HousekeepingTransitionTarget = 'IN_PROGRESS' | 'DONE';
export interface HousekeepingTransition { id: string; propertyId: string; status: HousekeepingTransitionTarget; updatedAt: string; }
