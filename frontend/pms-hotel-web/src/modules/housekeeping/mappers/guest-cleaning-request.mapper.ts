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
      || r.timeSlot !== '10:00–11:00' || r.cleaningType !== 'FULL_CLEANING'
      || !(r.notes === null || typeof r.notes === 'string' && r.notes.length <= 500)
      || !r.status || !['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED'].includes(r.status)) throw new DomainMappingError('INVALID_GUEST_CLEANING_REQUEST');
    return { id: r.id, propertyId, confirmationCode: r.confirmationCode, roomCode: r.roomCode,
      serviceDate: r.serviceDate, timeSlot: r.timeSlot, cleaningType: r.cleaningType, notes: r.notes, status: r.status };
  });
}
export function mapGuestCleaningRequests(value: unknown, propertyId: string): GuestCleaningRequest[] {
  return projectGuestCleaningRequests(value, propertyId).map(r => ({ id: r.id, propertyId,
    reference: r.confirmationCode, roomLabel: r.roomCode, serviceDate: r.serviceDate,
    timeSlot: r.timeSlot, serviceLabel: 'Limpieza completa', notes: r.notes, status: r.status }));
}
