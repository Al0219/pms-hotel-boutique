import type { RoomCatalogSnapshotDto } from '@/modules/rooms/dtos/room-catalog.dto';
// Shared test support; application tests do not import another module's internals.
export { staffReservationFixture } from '../modules/reservations/staff-reservation.fixture';

export const inventoryPropertyId = '22222222-2222-2222-2222-222222222222';
export function staffInventoryFixture(): RoomCatalogSnapshotDto {
  const common = { propertyId: inventoryPropertyId, createdAt: '2026-10-08T10:00:00.123456Z', updatedAt: '2026-10-08T10:00:00.123456Z' };
  const typeId = '55555555-5555-5555-5555-555555555555';
  return { types: [{ ...common, id: typeId, code: 'DELUXE', name: 'Deluxe real' }],
    rooms: [{ ...common, id: '77777777-7777-7777-7777-777777777777', roomTypeId: typeId, code: '101' },
      { ...common, id: '88888888-8888-8888-8888-888888888888', roomTypeId: typeId, code: '102' }] };
}
