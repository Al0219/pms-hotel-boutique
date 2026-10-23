import { expect, it } from 'vitest';
import { mapRoomAssignmentPreview } from './room-assignment.mapper';
import type { RoomAssignmentPreviewDto } from '../dtos/room-assignment.dto';
const scope = { propertyId: 'p', reservationId: 'r', stayId: 's' };
const dto: RoomAssignmentPreviewDto = { property_id: 'p', reservation_id: 'r', stay_id: 's', arrival: '2035-01-01', departure: '2035-01-03',
  room_type_id: 't', room_type: 'Deluxe', can_assign: true, reason: null, rooms: [{ room_id: 'a', number: '101', floor: null,
    operational_status: 'ACTIVE', selectable: false, reason: 'Habitación sucia: requiere limpieza.', housekeeping_status: 'DIRTY', ready_for_check_in: false, warning: 'Requiere limpieza e inspección.' }] };
it('preserves the dirty assignment block and still allows clean, untracked and inspected preassignment', () => {
  expect(mapRoomAssignmentPreview(dto, scope).rooms[0]).toMatchObject({ housekeepingStatus: 'DIRTY', readyForCheckIn: false, selectable: false, reason: dto.rooms[0].reason });
  for (const status of [null, 'CLEAN', 'INSPECTED'] as const) {
    const ready = status === 'INSPECTED';
    const result = mapRoomAssignmentPreview({ ...dto, rooms: [{ ...dto.rooms[0], selectable: true, reason: null, housekeeping_status: status, ready_for_check_in: ready, warning: ready ? null : 'Pendiente.' }] }, scope);
    expect(result.rooms[0]).toMatchObject({ housekeepingStatus: status, readyForCheckIn: ready, selectable: true });
  }
});
it('rejects an assignable dirty room or missing blocking reason', () => {
  for (const change of [{ selectable: true }, { reason: null }, { reason: ' ' }])
    expect(() => mapRoomAssignmentPreview({ ...dto, rooms: [{ ...dto.rooms[0], ...change }] }, scope)).toThrow();
});
it('rejects incoherent readiness and preserves unknown legacy cleaning without claiming ready', () => {
  expect(() => mapRoomAssignmentPreview({ ...dto, rooms: [{ ...dto.rooms[0], ready_for_check_in: true }] }, scope)).toThrow();
  const legacy = { ...dto.rooms[0], housekeeping_status: undefined, ready_for_check_in: undefined, warning: undefined };
  expect(mapRoomAssignmentPreview({ ...dto, rooms: [legacy] }, scope).rooms[0].readyForCheckIn).toBeUndefined();
});
