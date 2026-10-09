import { describe, expect, it } from 'vitest';
import { DomainMappingError } from '@/lib/errors';
import { inventoryPropertyId, staffInventoryFixture } from '@/test/staff-inventory-fixture';
import { mapStaffRooms, mapStaffRoomCatalog } from './staff-inventory.mapper';

describe('Real Staff Inventory mapping', () => {
  it('joins RoomType by identity and keeps operation and floor unavailable', () => {
    const result = mapStaffRooms(staffInventoryFixture(), inventoryPropertyId);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ number: '101', roomTypeLabel: 'Deluxe real', floor: null, status: null, readOnly: true });
    expect(mapStaffRoomCatalog(staffInventoryFixture(), inventoryPropertyId).types[0].presentation).toBeNull();
  });
  it('accepts zero rooms/types and rejects mismatched scope, references, identities or timestamps', () => {
    expect(mapStaffRooms({ rooms: [], types: [] }, inventoryPropertyId)).toEqual([]);
    const mutations = [
      (dto: ReturnType<typeof staffInventoryFixture>) => { dto.rooms[0].propertyId = 'other'; },
      (dto: ReturnType<typeof staffInventoryFixture>) => { dto.types = []; },
      (dto: ReturnType<typeof staffInventoryFixture>) => { dto.rooms[0].id = 'local-id'; },
      (dto: ReturnType<typeof staffInventoryFixture>) => { dto.rooms.push(dto.rooms[0]); },
      (dto: ReturnType<typeof staffInventoryFixture>) => { dto.types[0].updatedAt = 'invalid'; },
    ];
    for (const mutate of mutations) {
      const dto = staffInventoryFixture(); mutate(dto);
      expect(() => mapStaffRooms(dto, inventoryPropertyId)).toThrow(DomainMappingError);
    }
  });
});

it('preserves distinct code casing accepted by the real Inventory contract', () => {
  const fixture = staffInventoryFixture();
  fixture.types.push({ ...fixture.types[0], id: '99999999-9999-9999-9999-999999999999', code: fixture.types[0].code.toLowerCase() });
  expect(mapStaffRoomCatalog(fixture, inventoryPropertyId).types).toHaveLength(2);
});
it('preserves code whitespace as persisted rather than normalizing real Inventory identity', () => {
  const fixture = staffInventoryFixture();
  fixture.rooms[1].code = ` ${fixture.rooms[0].code} `;
  expect(mapStaffRoomCatalog(fixture, inventoryPropertyId).rooms.map(room => room.code)).toEqual(['101', ' 101 ']);
});
