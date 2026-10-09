import { describe, expect, it } from 'vitest';
import { inventoryPropertyId, staffInventoryFixture } from '@/test/staff-inventory-fixture';
import { mapStaffRooms } from './staff-inventory.mapper';
import { mapStaffRoomOccupancy } from './staff-room-occupancy.mapper';
import type { RoomStaySource } from '../model/room-occupancy';
const rooms = mapStaffRooms(staffInventoryFixture(), inventoryPropertyId);
function stay(overrides: Partial<RoomStaySource> = {}): RoomStaySource {
  return { propertyId: inventoryPropertyId, reservationId: 'reservation', stayId: 'stay', reservationStatus: 'CONFIRMED',
    roomId: rooms[0].id, guestName: null, roomType: 'Deluxe real', arrival: '2026-11-01', departure: '2026-11-03', travelState: 'RESERVED', ...overrides };
}
describe('Real stays by physical room and date', () => {
  it('preserves separate stays of one reservation and null rooms without code matching', () => {
    const result = mapStaffRoomOccupancy(rooms, [stay(), stay({ stayId: 'stay2', roomId: rooms[1].id, travelState: 'IN_HOUSE' }),
      stay({ stayId: 'stay3', roomId: null })], inventoryPropertyId, '2026-11-01');
    expect(result.rooms.map(r => r.state)).toEqual(['RESERVED', 'OCCUPIED']);
    expect(result.unassigned).toMatchObject([{ stayId: 'stay3', guestName: 'Responsable no registrado' }]);
    expect(result.rooms[0].stays).toHaveLength(1);
  });
  it('uses arrival inclusive, departure exclusive and excludes cancelled/terminal stays', () => {
    for (const date of ['2026-10-31', '2026-11-03'])
      expect(mapStaffRoomOccupancy(rooms, [stay()], inventoryPropertyId, date).rooms[0].state).toBe('FREE');
    const stays = ['CANCELLED', 'NO_SHOW', 'CHECKED_OUT'].map(travelState => stay({ travelState }));
    stays.push(stay({ reservationStatus: 'CANCELLED' }));
    expect(mapStaffRoomOccupancy(rooms, stays, inventoryPropertyId, '2026-11-01').rooms[0].state).toBe('FREE');
  });
  it('reports overlaps without silently picking a single stay', () => {
    const result = mapStaffRoomOccupancy(rooms, [stay(), stay({ stayId: 'second' })], inventoryPropertyId, '2026-11-01');
    expect(result.rooms[0].state).toBe('CONFLICT'); expect(result.rooms[0].stays).toHaveLength(2);
  });
  it('fails instead of reporting free/unassigned for scope or room identity mismatch', () => {
    expect(() => mapStaffRoomOccupancy(rooms, [stay({ propertyId: 'other' })], inventoryPropertyId, '2026-11-01')).toThrow('OCCUPANCY_CONTEXT_MISMATCH');
    expect(() => mapStaffRoomOccupancy(rooms, [stay({ roomId: '101' })], inventoryPropertyId, '2026-11-01')).toThrow('OCCUPANCY_ROOM_NOT_IN_INVENTORY');
    expect(() => mapStaffRoomOccupancy(rooms, [], inventoryPropertyId, '2026-02-30')).toThrow('OCCUPANCY_CONTEXT_MISMATCH');
  });
});
