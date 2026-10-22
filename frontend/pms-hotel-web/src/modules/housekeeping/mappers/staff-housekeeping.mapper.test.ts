import { describe, expect, it } from 'vitest';
import { DomainMappingError } from '@/lib/errors/domain-mapping-error';
import { mapStaffHousekeepingBoard, mapStaffHousekeepingRoom } from './staff-housekeeping.mapper';
const propertyId = '22222222-2222-4222-8222-222222222222';
const room = { propertyId, roomId:'33333333-3333-4333-8333-333333333333', roomCode:'101', roomTypeId:'44444444-4444-4444-8444-444444444444',roomTypeName:'Deluxe',tracked:true,status:'CLEAN',dnd:false,updatedAt:'2035-01-01T12:00:00.123456Z' };
describe('real Housekeeping projection', () => {
  it('preserves the exact persisted concurrency token and removes extra fields', () => {
    expect(mapStaffHousekeepingRoom({ ...room, token:'secret' },propertyId)).toEqual(room);
    expect(mapStaffHousekeepingBoard({ propertyId,rooms:[room] },propertyId).rooms[0].updatedAt).toBe(room.updatedAt);
  });
  it('represents an untracked room without inventing a cleaning state', () => {
    const untracked = { ...room,tracked:false,status:null,dnd:null,updatedAt:null };
    expect(mapStaffHousekeepingRoom(untracked,propertyId)).toEqual(untracked);
    expect(mapStaffHousekeepingBoard({ propertyId,rooms:[] },propertyId).rooms).toEqual([]);
  });
  it.each([{ status:'OCCUPIED' },{ tracked:false },{ dnd:null },{ updatedAt:'2035-01-01' },{ roomId:'invalid' },{ roomTypeName:'' },{ propertyId:'55555555-5555-4555-8555-555555555555' }])('rejects inconsistent data %j',patch => {
    expect(() => mapStaffHousekeepingRoom({ ...room,...patch },propertyId)).toThrow(DomainMappingError);
  });
  it('rejects duplicate IDs and a room different from the requested detail', () => {
    expect(() => mapStaffHousekeepingBoard({propertyId,rooms:[room,room]},propertyId)).toThrow(DomainMappingError);
    expect(() => mapStaffHousekeepingRoom(room,propertyId,'55555555-5555-4555-8555-555555555555')).toThrow(DomainMappingError);
  });
});
