import { DomainMappingError } from '@/lib/errors/domain-mapping-error';
import { isRoomCleaningStatus } from '../model/room-cleaning';
import type { StaffHousekeepingBoard, StaffHousekeepingRoom } from '../model/staff-housekeeping';

const uuidPattern = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
function invalid(): never { throw new DomainMappingError('INVALID_STAFF_HOUSEKEEPING'); }
function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : invalid();
}
function text(value: unknown): string { return typeof value === 'string' && value.trim() ? value : invalid(); }
function uuid(value: unknown): string { const id = text(value); return uuidPattern.test(id) ? id.toLowerCase() : invalid(); }

/** Also the deliberate BFF projection: only contract51 fields can leave the server. */
export function mapStaffHousekeepingRoom(value: unknown, propertyId: string, roomId?: string): StaffHousekeepingRoom {
  const r = object(value), id = uuid(r.roomId);
  if (uuid(r.propertyId) !== propertyId.toLowerCase() || (roomId && id !== roomId.toLowerCase()) || typeof r.tracked !== 'boolean') invalid();
  const common = { roomId: id, propertyId: uuid(r.propertyId), roomCode: text(r.roomCode), roomTypeId: uuid(r.roomTypeId), roomTypeName: text(r.roomTypeName) };
  const cleaningReason = r.cleaningReason === null ? null : text(r.cleaningReason);
  if (cleaningReason !== null && (!r.tracked || r.status !== 'DIRTY')) invalid();
  if (!r.tracked) {
    if (r.status !== null || r.dnd !== null || r.updatedAt !== null) invalid();
    return { ...common, tracked: false, status: null, dnd: null, updatedAt: null, cleaningReason: null };
  }
  if (typeof r.status !== 'string' || !isRoomCleaningStatus(r.status) || typeof r.dnd !== 'boolean'
    || typeof r.updatedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(r.updatedAt)
    || !Number.isFinite(Date.parse(r.updatedAt))) invalid();
  return { ...common, tracked: true, status: r.status, dnd: r.dnd, updatedAt: r.updatedAt, cleaningReason };
}
export function mapStaffHousekeepingBoard(value: unknown, propertyId: string): StaffHousekeepingBoard {
  const data = object(value);
  if (uuid(data.propertyId) !== propertyId.toLowerCase() || !Array.isArray(data.rooms)) invalid();
  const rooms = data.rooms.map(room => mapStaffHousekeepingRoom(room, propertyId));
  if (new Set(rooms.map(room => room.roomId)).size !== rooms.length) invalid();
  return { propertyId: uuid(data.propertyId), rooms };
}
