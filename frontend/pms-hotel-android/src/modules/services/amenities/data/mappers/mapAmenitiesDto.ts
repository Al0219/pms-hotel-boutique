import { DomainMappingError } from '@/domain/errors/DomainMappingError';
import type { ActiveReservationContext } from '@/modules/guest-auth/domain/models/ActiveReservationContext';
import type { AmenityCatalogItem } from '../../domain/AmenitiesRequest';
import type { PersistedAmenitiesRequest } from '../../domain/PersistedAmenitiesRequest';
import type { AmenityCatalogDto, AmenitiesRequestDto } from '../dtos/AmenitiesDto';
const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
function invalid(): never { throw new DomainMappingError('amenities'); }
export function mapAmenitiesCatalog(rows: AmenityCatalogDto[]): readonly AmenityCatalogItem[] {
  if (!Array.isArray(rows)) return invalid();
  const ids = new Set<string>();
  return rows.map(row => {
    if (!row || !uuid.test(row.id) || ids.has(row.id) || !text(row.code) || !text(row.name)) return invalid();
    ids.add(row.id);
    // Cart's existing identity field carries only the persisted UUID in real mode.
    return { fixtureKey: row.id, name: row.name };
  });
}
export function mapAmenitiesRequest(row: AmenitiesRequestDto, context: ActiveReservationContext): PersistedAmenitiesRequest {
  if (!row || !uuid.test(row.id) || !uuid.test(row.propertyId) || row.reservationId !== context.reservationId || row.stayId !== context.reservationStayId
    || !text(row.confirmationCode) || !(row.roomCode === null || text(row.roomCode))
    || !['OPEN','IN_PROGRESS','DONE','CANCELLED'].includes(row.status)
    || !/^\d{4}-\d{2}-\d{2}$/.test(row.serviceDate) || !Number.isFinite(Date.parse(row.serviceDate))
    || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(row.deliveryTime)
    || !(row.notes === null || typeof row.notes === 'string' && row.notes.length <= 500)
    || [row.createdAt,row.updatedAt,row.modifiableUntil].some(value => typeof value !== 'string' || !Number.isFinite(Date.parse(value)))
    || !Array.isArray(row.items) || !row.items.length || row.items.length > 5) return invalid();
  const ids = new Set<string>();
  const items = row.items.map(line => {
    if (!line || !uuid.test(line.itemId) || ids.has(line.itemId) || !text(line.itemName) || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 5) return invalid();
    ids.add(line.itemId); return { itemId: line.itemId, itemName: line.itemName, quantity: line.quantity };
  });
  return { id:row.id,reservationId:row.reservationId,stayId:row.stayId,confirmationCode:row.confirmationCode,
    serviceDate:row.serviceDate,deliveryTime:row.deliveryTime,notes:row.notes,status:row.status as PersistedAmenitiesRequest['status'],
    createdAt:row.createdAt,updatedAt:row.updatedAt,modifiableUntil:row.modifiableUntil,items };
}
