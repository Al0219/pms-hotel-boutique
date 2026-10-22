import { afterEach, expect, it, vi } from 'vitest';
const http=vi.hoisted(() => ({read:vi.fn(),write:vi.fn()}));
vi.mock('@/lib/http/staff-bff',() => ({staffBffRead:http.read,staffBffRequest:http.write}));
import { changeStaffHousekeeping, readStaffHousekeeping } from './staff-housekeeping.service';
const propertyId='22222222-2222-4222-8222-222222222222';
const room={propertyId,roomId:'33333333-3333-4333-8333-333333333333',roomCode:'101',roomTypeId:'44444444-4444-4444-8444-444444444444',roomTypeName:'Deluxe',tracked:true,status:'CLEAN' as const,dnd:false,updatedAt:'2035-01-01T12:00:00.123456Z'};
afterEach(() => vi.clearAllMocks());
it('uses real same-origin Staff transport independent of general mocks',() => {
  readStaffHousekeeping(propertyId);
  expect(http.read).toHaveBeenCalledWith(`/api/staff/housekeeping/rooms?propertyId=${propertyId}`,undefined);
  changeStaffHousekeeping(propertyId,{room,action:'status',toStatus:'DIRTY',reason:'Repetir limpieza'});
  expect(http.write).toHaveBeenCalledWith(`/api/staff/housekeeping/rooms/${room.roomId}/status?propertyId=${propertyId}`,{method:'PUT',json:{expectedStatus:'CLEAN',expectedUpdatedAt:room.updatedAt,toStatus:'DIRTY',reason:'Repetir limpieza'},signal:undefined});
});
it('never sends a command to another property',() => {
  expect(() => changeStaffHousekeeping('55555555-5555-4555-8555-555555555555',{room,action:'dnd',dnd:true})).toThrow('HOUSEKEEPING_SCOPE_MISMATCH');
  expect(http.write).not.toHaveBeenCalled();
});
