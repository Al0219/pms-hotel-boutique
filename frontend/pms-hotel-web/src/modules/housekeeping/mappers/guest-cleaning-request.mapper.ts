import { DomainMappingError } from '@/lib/errors/domain-mapping-error';
import type { GuestCleaningRequest } from '../model/guest-cleaning-request';
import type { GuestCleaningRequestDto } from '../dtos/guest-cleaning-request.dto';

const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
/** Strict allowlist also used by the authenticated BFF. */
export function projectGuestCleaningRequests(value: unknown, propertyId: string): GuestCleaningRequestDto[] {
  if (!Array.isArray(value)) throw new DomainMappingError('INVALID_GUEST_CLEANING_REQUESTS');
  return value.map((row: unknown) => {
    const r = row as Partial<GuestCleaningRequestDto> | null;
    if (!r || typeof r.id !== 'string' || !uuid.test(r.id) || r.propertyId !== propertyId
      || typeof r.confirmationCode !== 'string' || !r.confirmationCode.trim()
      || !(r.roomCode === null || typeof r.roomCode === 'string' && r.roomCode.trim())
      || typeof r.serviceDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.serviceDate) || !Number.isFinite(Date.parse(r.serviceDate))
      || typeof r.timeSlot !== 'string' || !['09:00–10:00', '10:00–11:00', '11:00–12:00', '12:00–13:00', '14:00–15:00', '18:00–19:00'].includes(r.timeSlot ?? '') || r.cleaningType !== 'FULL_CLEANING'
      || !(r.notes === null || typeof r.notes === 'string' && r.notes.length <= 500)
      || typeof r.updatedAt !== 'string' || !Number.isFinite(Date.parse(r.updatedAt))
      || !r.status || !['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED'].includes(r.status)) throw new DomainMappingError('INVALID_GUEST_CLEANING_REQUEST');
    return { id: r.id, propertyId, confirmationCode: r.confirmationCode, roomCode: r.roomCode,
      serviceDate: r.serviceDate, timeSlot: r.timeSlot, cleaningType: r.cleaningType, notes: r.notes, status: r.status, updatedAt: r.updatedAt };
  });
}
export function mapGuestCleaningRequests(value: unknown, propertyId: string): GuestCleaningRequest[] {
  return projectGuestCleaningRequests(value, propertyId).map(r => ({ id: r.id, propertyId,
    reference: r.confirmationCode, roomLabel: r.roomCode, serviceDate: r.serviceDate,
    timeSlot: r.timeSlot, serviceLabel: 'Limpieza completa', notes: r.notes, status: r.status, updatedAt: r.updatedAt }));
}

export function projectHousekeepingTransition(value: unknown, propertyId: string, id: string, target: 'IN_PROGRESS' | 'DONE'): import('../dtos/guest-cleaning-request.dto').HousekeepingTransitionDto {
  const row = value as Record<string, unknown> | null;
  if (!row || row.id !== id || row.propertyId !== propertyId || row.status !== target
    || typeof row.updatedAt !== 'string' || !Number.isFinite(Date.parse(row.updatedAt))) throw new DomainMappingError('INVALID_HOUSEKEEPING_TRANSITION');
  return { id, propertyId, status: target, updatedAt: row.updatedAt };
}
