import { staffBffRead } from '@/lib/http/staff-bff';
import type { RoomCatalogSnapshotDto } from '../dtos/room-catalog.dto';

export const staffRoomsEndpoint = '/api/staff/rooms';

/** Both arrays retain the confirmed Inventory fields. No operational metadata is added. */
export async function readStaffInventory(propertyId: string, signal?: AbortSignal): Promise<RoomCatalogSnapshotDto> {
  const query = new URLSearchParams({ propertyId });
  const [rooms, types] = await Promise.all([
    staffBffRead<RoomCatalogSnapshotDto['rooms']>(`${staffRoomsEndpoint}?${query}`, signal),
    staffBffRead<RoomCatalogSnapshotDto['types']>(`/api/staff/room-types?${query}`, signal),
  ]);
  return { rooms, types };
}
