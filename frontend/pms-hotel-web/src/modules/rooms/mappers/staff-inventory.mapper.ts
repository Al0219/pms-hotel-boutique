import { DomainMappingError } from '@/lib/errors';
import type { RoomCatalogSnapshotDto } from '../dtos/room-catalog.dto';
import type { Room } from '../model/room';
import { mapRoomCatalog } from './room-catalog.mapper';

/** Unknown operation/floor is explicit; never use a mock fallback or infer ACTIVE. */
export function mapStaffRoomCatalog(dto: RoomCatalogSnapshotDto, propertyId: string) {
  const catalog = mapRoomCatalog(dto, propertyId, { exactText: true });
  const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
  if (!uuid.test(propertyId) || [...catalog.rooms, ...catalog.types].some(item => !uuid.test(item.id)))
    throw new DomainMappingError('INVALID_STAFF_INVENTORY_ID');
  return {
    types: catalog.types.map(type => ({ ...type, presentation: null })),
    rooms: catalog.rooms.map(room => ({ ...room, floor: null, internalNotes: null })),
  };
}

export function mapStaffRooms(dto: RoomCatalogSnapshotDto, propertyId: string): Room[] {
  const catalog = mapStaffRoomCatalog(dto, propertyId);
  return catalog.rooms.map(room => ({ id: room.id, propertyId: room.propertyId, number: room.code, roomTypeId: room.roomTypeId,
    roomTypeLabel: catalog.types.find(type => type.id === room.roomTypeId)!.name,
    floor: null, status: null, readOnly: true }));
}
