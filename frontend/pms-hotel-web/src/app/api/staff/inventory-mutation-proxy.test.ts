import { NextRequest } from 'next/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { inventoryPropertyId, staffInventoryFixture } from '@/test/staff-inventory-fixture';
const fetchMock = vi.fn<typeof fetch>();
let rooms: typeof import('./rooms/route'), types: typeof import('./room-types/route');
let roomPatch: typeof import('./rooms/[roomId]/route'), typePatch: typeof import('./room-types/[roomTypeId]/route');
beforeEach(async () => {
  vi.resetModules(); vi.stubEnv('PMS_BACKEND_INTERNAL_URL', 'http://backend:8080'); vi.stubEnv('PMS_WEB_PUBLIC_URL', 'https://pms.example');
  vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset();
  rooms = await import('./rooms/route'); types = await import('./room-types/route');
  roomPatch = await import('./rooms/[roomId]/route'); typePatch = await import('./room-types/[roomTypeId]/route');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
function request(method: string, body: unknown, cookie = 'pms_staff_access=staff-cookie; pms_guest_access=guest-cookie', origin = 'https://pms.example', query = `propertyId=${inventoryPropertyId}`) {
  return new NextRequest(`http://web:3000/api/staff/rooms?${query}`, { method, headers: { cookie, origin, 'content-type': 'application/json', authorization: 'Bearer untrusted' }, body: typeof body === 'string' ? body : JSON.stringify(body) });
}
it.each(['create-room', 'edit-room', 'create-type', 'edit-type'] as const)('forwards approved %s with only Staff cookie and projects the real response', async action => {
  const isRoom = action.endsWith('room'), edit = action.startsWith('edit');
  const item = isRoom ? staffInventoryFixture().rooms[0] : staffInventoryFixture().types[0];
  const body = isRoom ? edit ? { code: '106' } : { code: '106', roomTypeId: staffInventoryFixture().types[0].id } : edit ? { name: 'Nuevo nombre' } : { code: 'NEW', name: 'Nuevo nombre' };
  fetchMock.mockResolvedValue(Response.json({ ...item, accessToken: 'hidden', floor: 'hidden', status: 'ACTIVE' }, { status: edit ? 200 : 201 }));
  const req = request(edit ? 'PATCH' : 'POST', body);
  const result = edit ? isRoom ? await roomPatch.PATCH(req, { params: Promise.resolve({ roomId: item.id }) }) : await typePatch.PATCH(req, { params: Promise.resolve({ roomTypeId: item.id }) })
    : await (isRoom ? rooms : types).POST(req);
  expect(result.status).toBe(edit ? 200 : 201); expect(await result.json()).toEqual(item);
  expect(result.headers.get('cache-control')).toBe('private, no-store');
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe(`http://backend:8080/api/v1/properties/${inventoryPropertyId}/${isRoom ? 'rooms' : 'room-types'}${edit ? `/${item.id}` : ''}`);
  expect(init?.method).toBe(edit ? 'PATCH' : 'POST'); expect(JSON.parse(init?.body as string)).toEqual(body);
  expect(new Headers(init?.headers).get('authorization')).toBe('Bearer staff-cookie'); expect(new Headers(init?.headers).get('cookie')).toBeNull();
  expect(init?.cache).toBe('no-store'); expect(init?.signal).toBeInstanceOf(AbortSignal);
  expect(Object.keys(roomPatch)).toEqual(['PATCH']); expect(Object.keys(typePatch)).toEqual(['PATCH']);
});
it('rejects cross-origin, missing Staff, invalid scope and noncontracted metadata before upstream', async () => {
  const valid = { code: '101', roomTypeId: staffInventoryFixture().types[0].id };
  expect((await rooms.POST(request('POST', valid, 'pms_guest_access=guest-cookie'))).status).toBe(401);
  expect((await rooms.POST(request('POST', valid, undefined, 'https://evil.example'))).status).toBe(403);
  expect((await rooms.POST(request('POST', valid, undefined, ''))).status).toBe(403);
  for (const query of ['propertyId=ALL_PROPERTIES', '', `propertyId=${inventoryPropertyId}&propertyId=${inventoryPropertyId}`, `propertyId=${inventoryPropertyId}&target=evil`]) expect((await rooms.POST(request('POST', valid, undefined, undefined, query))).status).toBe(400);
  for (const body of [null, [], {}, '{bad', { ...valid, floor: '1' }, { ...valid, status: 'ACTIVE' }, { ...valid, propertyId: inventoryPropertyId }, { ...valid, code: ' ' }, { ...valid, code: 'a'.repeat(65) }, { ...valid, roomTypeId: 'bad' }]) expect((await rooms.POST(request('POST', body))).status).toBe(400);
  const params = { params: Promise.resolve({ roomId: staffInventoryFixture().rooms[0].id }) };
  for (const body of [{}, { code: null }, { code: '102', roomTypeId: valid.roomTypeId }, { code: '102', notes: 'local' }]) expect((await roomPatch.PATCH(request('PATCH', body), params)).status).toBe(400);
  for (const body of [{}, { code: null }, { name: '' }, { name: 'a'.repeat(161) }, { name: 'name', photos: [] }]) expect((await typePatch.PATCH(request('PATCH', body), { params: Promise.resolve({ roomTypeId: valid.roomTypeId }) })).status).toBe(400);
  expect((await roomPatch.PATCH(request('PATCH', { code: '102' }), { params: Promise.resolve({ roomId: '../escape' }) })).status).toBe(400);
  expect(fetchMock).not.toHaveBeenCalled();
});
it.each([400, 401, 403, 404, 409, 500, 502, 503])('preserves contracted failure %i without leaking Backend details or retrying', async status => {
  fetchMock.mockResolvedValue(Response.json({ sql: 'private', accessToken: 'secret' }, { status }));
  const response = await types.POST(request('POST', { code: 'NEW', name: 'New' }));
  expect(response.status).toBe(status >= 500 ? 503 : status); expect(await response.text()).not.toMatch(/private|secret/); expect(fetchMock).toHaveBeenCalledTimes(1);
});
it('fails closed on transport and mismatched mutation replies', async () => {
  const item = staffInventoryFixture().rooms[0], body = { code: '101', roomTypeId: item.roomTypeId };
  fetchMock.mockRejectedValueOnce(new Error('private error'));
  expect((await rooms.POST(request('POST', body))).status).toBe(503);
  for (const value of [[], { ...item, propertyId: 'other' }, { ...item, createdAt: 'bad' }, { ...item, roomTypeId: 'local' }]) {
    fetchMock.mockResolvedValueOnce(Response.json(value, { status: 201 })); expect((await rooms.POST(request('POST', body))).status).toBe(503);
  }
  fetchMock.mockResolvedValueOnce(Response.json({ ...item, id: staffInventoryFixture().rooms[1].id }));
  expect((await roomPatch.PATCH(request('PATCH', { code: '101' }), { params: Promise.resolve({ roomId: item.id }) })).status).toBe(503);
});
