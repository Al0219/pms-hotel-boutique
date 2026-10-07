import { delay, http, HttpResponse } from 'msw';
import type { RoomDto } from '@/modules/rooms/dtos/room.dto';
import type { RoomCatalogSnapshotDto } from '@/modules/rooms/dtos/room-catalog.dto';
import type { RoomCatalogChange } from '@/modules/rooms/model/room-catalog';

const stamp = '2026-10-06T12:00:00.000Z';
const seededCodes = ['101','102','103','201','202','203','204','301','302','401'];
const snapshots = new Map<string, RoomCatalogSnapshotDto>();
const operational = new Map<string, RoomDto[]>();
export function resetStaffRoomCatalog() { snapshots.clear(); operational.clear(); }
function initial(propertyId: string): RoomCatalogSnapshotDto {
  const types = [ ['RT-STD','STD','Estandar Doble'], ['RT-DLX','DLX-KING','Deluxe King'], ['RT-SUITE','SUITE','Suite Jardin'], ['RT-MASTER','MASTER','Master Suite Presidencial'] ]
    .map(([id,code,name]) => ({ id, code, name, propertyId, createdAt: stamp, updatedAt: stamp }));
  const rooms = seededCodes.map(code => ({ id: `ROOM-${code}`, propertyId, code,
    roomTypeId: types[Number(code[0])-1].id, createdAt: stamp, updatedAt: stamp }));
  return propertyId === 'GT-HB-01' ? { types, rooms } : { types: [], rooms: [] };
}
export function roomCatalogFixture(propertyId: string): RoomCatalogSnapshotDto {
  if (!snapshots.has(propertyId)) snapshots.set(propertyId, initial(propertyId));
  return snapshots.get(propertyId)!;
}
/** Local operational projection. Its status/floor are not fields of Backend RoomView. */
export function operationalRoomFixture(propertyId: string): RoomDto[] {
  const catalog = roomCatalogFixture(propertyId);
  const previous = operational.get(propertyId) ?? [];
  const rooms = catalog.rooms.map(room => {
    const old = previous.find(item => item.room_id === room.id);
    const seed = seededCodes.find(code => room.id === `ROOM-${code}`);
    return { room_id: room.id, property_id: propertyId, number: room.code, room_type_label: catalog.types.find(type => type.id === room.roomTypeId)!.name,
      floor: old ? old.floor : seed?.[0] ?? null,
      status: old?.status ?? (seed === '103' ? 'OOO' : seed === '204' ? 'OOS' : 'ACTIVE') };
  });
  operational.set(propertyId, rooms); return rooms;
}
const path = '*/__mock/staff-room-catalog/:propertyId';
export const staffRoomCatalogHandlers = [
  http.get(path, async ({ params, request }) => { await delay(150); if (request.signal.aborted) return new HttpResponse(null,{status:409}); return HttpResponse.json(roomCatalogFixture(String(params.propertyId))); }),
  http.post(path, async ({ params, request }) => {
    const propertyId = String(params.propertyId), snapshot = roomCatalogFixture(propertyId);
    const change = await request.json() as RoomCatalogChange;
    await delay(250);
    if (request.signal.aborted) return new HttpResponse(null,{status:409});
    if (!change || !['create-type','edit-type','create-room','edit-room'].includes(change.kind) || typeof change.code !== 'string' || !change.code.trim() || change.code.trim().length > 64) return new HttpResponse(null,{status:400});
    const typeChange = change.kind.endsWith('type'), editing = change.kind.startsWith('edit');
    const entries = typeChange ? snapshot.types : snapshot.rooms;
    const id = 'id' in change ? change.id : undefined;
    const existing = entries.find(entry => entry.id === id);
    if (editing && !existing) return new HttpResponse(null,{status:404});
    const code = change.code.trim();
    if (entries.some(entry => entry.id !== id && entry.code.toLocaleLowerCase('es') === code.toLocaleLowerCase('es'))) return new HttpResponse(null,{status:409});
    if (typeChange && (!('name' in change) || typeof change.name !== 'string' || !change.name.trim() || change.name.trim().length > 160)) return new HttpResponse(null,{status:400});
    if (change.kind === 'create-room' && !snapshot.types.some(type => type.id === change.roomTypeId)) return new HttpResponse(null,{status:400});
    const now = new Date().toISOString();
    if (change.kind === 'create-type') snapshot.types.push({ id: crypto.randomUUID(), propertyId, code, name: change.name.trim(), createdAt:now, updatedAt:now });
    if (change.kind === 'create-room') snapshot.rooms.push({ id: crypto.randomUUID(), propertyId, code, roomTypeId:change.roomTypeId, createdAt:now, updatedAt:now });
    if (existing) { existing.code = code; existing.updatedAt = now; if (change.kind === 'edit-type' && 'name' in existing) existing.name = change.name.trim(); }
    return HttpResponse.json(snapshot);
  }),
];
