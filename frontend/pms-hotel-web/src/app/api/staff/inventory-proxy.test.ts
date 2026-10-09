import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { inventoryPropertyId, staffInventoryFixture } from '@/test/staff-inventory-fixture';

const fetchMock = vi.fn<typeof fetch>();
let rooms: typeof import('./rooms/route');
let types: typeof import('./room-types/route');
beforeEach(async () => {
  vi.resetModules(); vi.stubEnv('PMS_BACKEND_INTERNAL_URL', 'http://backend:8080');
  vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset();
  rooms = await import('./rooms/route'); types = await import('./room-types/route');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
function request(query = `propertyId=${inventoryPropertyId}`, cookie = 'pms_staff_access=synthetic-staff; pms_guest_access=synthetic-guest') {
  return new NextRequest(`http://localhost/api/staff/rooms?${query}`, { headers: { cookie, authorization: 'Bearer untrusted-browser' } });
}
describe('Inventory Staff read BFF', () => {
  it.each(['rooms', 'types'] as const)('uses only the Staff cookie and fixed upstream path for %s', async resource => {
    const fixture = staffInventoryFixture()[resource];
    fetchMock.mockResolvedValue(Response.json(fixture.map(r => ({ ...r, status: 'ACTIVE', floor: 'invented', accessToken: 'hidden' }))));
    const response = await (resource === 'rooms' ? rooms : types).GET(request());
    expect(response.status).toBe(200); expect(await response.json()).toEqual(fixture);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`http://backend:8080/api/v1/properties/${inventoryPropertyId}/${resource === 'rooms' ? 'rooms' : 'room-types'}`);
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer synthetic-staff');
    expect(new Headers(init?.headers).get('cookie')).toBeNull();
    expect(init?.cache).toBe('no-store'); expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(Object.keys(rooms).sort()).toEqual(['GET', 'POST']); expect(Object.keys(types).sort()).toEqual(['GET', 'POST']);
  });
  it.each(['', 'pms_guest_access=guest-only'])('rejects missing Staff cookie (%s) before upstream', async cookie => {
    expect((await rooms.GET(request(undefined, cookie))).status).toBe(401);
    expect((await types.GET(request(undefined, cookie))).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(['', 'propertyId=ALL_PROPERTIES', 'propertyId=../rooms', `propertyId=${inventoryPropertyId}&propertyId=${inventoryPropertyId}`,
    `propertyId=${inventoryPropertyId}&target=http://evil.test`])('rejects invalid query %s', async query => {
    expect((await rooms.GET(request(query))).status).toBe(400);
    expect((await types.GET(request(query))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([400, 401, 403, 404, 500, 502])('preserves authorization/resource status %i and sanitizes bodies', async status => {
    fetchMock.mockResolvedValue(Response.json({ sql: 'sensitive' }, { status }));
    const response = await rooms.GET(request());
    expect(response.status).toBe(status >= 500 ? 503 : status);
    expect(JSON.stringify(await response.json())).not.toContain('sensitive');
  });
  it('accepts empty catalog arrays', async () => {
    fetchMock.mockImplementation(async () => Response.json([]));
    expect(await (await rooms.GET(request())).json()).toEqual([]);
    expect(await (await types.GET(request())).json()).toEqual([]);
  });
  it('fails closed on transport, malformed shape, duplicates, timestamps and cross-property data', async () => {
    fetchMock.mockRejectedValueOnce(new Error('private transport error'));
    expect((await rooms.GET(request())).status).toBe(503);
    const room = staffInventoryFixture().rooms[0];
    for (const body of [{ rooms: [room] }, [room, room], [{ ...room, propertyId: 'other-property' }],
      [{ ...room, createdAt: 'bad' }], [{ ...room, updatedAt: '2026-01-01T00:00:00Z' }], [{ ...room, roomTypeId: 'bad' }]]) {
      fetchMock.mockResolvedValueOnce(Response.json(body));
      expect((await rooms.GET(request())).status).toBe(503);
    }
    fetchMock.mockResolvedValueOnce(new Response('broken'));
    expect((await types.GET(request())).status).toBe(503);
  });
});
