import { DomainMappingError } from '@/domain/errors/DomainMappingError';
import { type ActiveReservationContext } from '@/modules/guest-auth/domain/models/ActiveReservationContext';
import { type HousekeepingRequestDto } from '../dtos/HousekeepingRequestDto';
import { type PersistedHousekeepingRequest } from '../../domain/PersistedHousekeepingRequest';

export function mapHousekeepingRequestDto(dto: HousekeepingRequestDto, context: ActiveReservationContext): PersistedHousekeepingRequest {
  if (!dto || typeof dto.id !== 'string' || !dto.id.trim()
    || dto.reservationId !== context.reservationId || dto.stayId !== context.reservationStayId
    || !/^\d{4}-\d{2}-\d{2}$/.test(dto.serviceDate) || !Number.isFinite(Date.parse(dto.serviceDate))
    || dto.timeSlot !== '10:00–11:00' || dto.cleaningType !== 'FULL_CLEANING'
    || !(dto.notes === null || typeof dto.notes === 'string' && dto.notes.length <= 500)
    || !['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED'].includes(dto.status)
    || typeof dto.createdAt !== 'string' || !Number.isFinite(Date.parse(dto.createdAt))) {
    throw new DomainMappingError('housekeepingRequest');
  }
  return { id: dto.id, reservationId: dto.reservationId, stayId: dto.stayId,
    serviceDate: dto.serviceDate, timeSlot: dto.timeSlot, cleaningType: dto.cleaningType,
    notes: dto.notes, status: dto.status, createdAt: dto.createdAt };
}
