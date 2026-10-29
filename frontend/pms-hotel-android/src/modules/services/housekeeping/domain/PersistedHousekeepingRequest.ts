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
  updatedAt: string;
  modifiableUntil: string;
}
export const housekeepingStatusLabels: Record<PersistedHousekeepingRequest['status'], string> = {
  OPEN: 'Solicitado', IN_PROGRESS: 'En proceso', DONE: 'Completado', CANCELLED: 'Cancelado',
};

/** Client hint only; server revalidates status, ownership and cutoff on every write. */
export function canModifyPersistedHousekeeping(request: PersistedHousekeepingRequest, nowMs: number): boolean {
  return request.status === 'OPEN' && nowMs < Date.parse(request.modifiableUntil);
}
