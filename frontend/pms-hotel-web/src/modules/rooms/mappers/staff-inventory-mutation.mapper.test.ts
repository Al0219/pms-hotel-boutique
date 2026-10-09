import { expect, it } from 'vitest';
import { DomainMappingError } from '@/lib/errors';
import { inventoryPropertyId, staffInventoryFixture } from '@/test/staff-inventory-fixture';
import { mapStaffInventoryMutation } from './staff-inventory-mutation.mapper';
it('maps acknowledged writes without provisional operational/editorial metadata', () => {
  const fixture = staffInventoryFixture(), room = fixture.rooms[0], type = fixture.types[0];
  const result = mapStaffInventoryMutation({ ...room, floor: '1', internalNotes: 'fake', status: 'ACTIVE' }, inventoryPropertyId, { kind: 'edit-room', id: room.id, code: room.code });
  expect(result).toMatchObject({ kind: 'room', entry: { floor: null, internalNotes: null, roomTypeId: room.roomTypeId, createdAt: expect.any(Date) } });
  expect(mapStaffInventoryMutation({ ...type, presentation: { description: 'fake' } }, inventoryPropertyId, { kind: 'create-type', code: type.code, name: type.name })).toMatchObject({ kind: 'type', entry: { presentation: null } });
});
it('rejects wrong identity/property, timestamps and missing required fields', () => {
  const room = staffInventoryFixture().rooms[0], command = { kind: 'edit-room' as const, id: room.id, code: '102' };
  for (const value of [{ ...room, id: 'bad' }, { ...room, propertyId: 'other' }, { ...room, code: '' }, { ...room, roomTypeId: 'bad' }, { ...room, updatedAt: '2026-01-01T00:00:00Z' }, { ...room, createdAt: 'bad' }]) expect(() => mapStaffInventoryMutation(value, inventoryPropertyId, command)).toThrow(DomainMappingError);
});
it('keeps the acknowledged raw code and name without client-side normalization', () => {
  const type = staffInventoryFixture().types[0];
  expect(mapStaffInventoryMutation({ ...type, code: ' NEW ', name: ' Name ' }, inventoryPropertyId, { kind: 'edit-type', id: type.id, code: ' NEW ' })).toMatchObject({ entry: { code: ' NEW ', name: ' Name ' } });
});
