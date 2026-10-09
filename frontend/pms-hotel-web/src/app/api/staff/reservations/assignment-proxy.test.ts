import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PUT } from './[reservationId]/stays/[stayId]/room-assignment/route';
const mocks = vi.hoisted(() => ({ backend: vi.fn() }));
vi.mock('@/lib/bff/staff-auth', () => ({ staffAccessCookie: 'pms_staff_access', backendStaffRequest: mocks.backend }));
const property = '11111111-1111-1111-1111-111111111111', reservationId = '22222222-2222-2222-2222-222222222222';
const stayId = '33333333-3333-3333-3333-333333333333', room = '44444444-4444-4444-4444-444444444444';
const context = { params: Promise.resolve({ reservationId, stayId }) };
const scope = { property_id: property, reservation_id: reservationId, stay_id: stayId };
const preview = { ...scope, arrival: '2035-01-01', departure: '2035-01-03', room_type_id: room, room_type: 'Deluxe', can_assign: true, reason: null,
  rooms: [{ room_id: room, number: '203', floor: null, operational_status: 'ACTIVE', selectable: true, reason: null }] };
function request(method = 'GET', cookie = 'pms_staff_access=synthetic-staff; pms_guest_access=synthetic-guest', origin = 'http://localhost:3001', body: unknown = { room_id: room }) {
  return new NextRequest(`http://localhost:3001/api/staff/reservations/${reservationId}/stays/${stayId}/room-assignment?propertyId=${property}`, {
    method, headers: { cookie, origin, 'content-type': 'application/json' }, ...(method === 'PUT' ? { body: JSON.stringify(body) } : {}),
  });
}
beforeEach(() => { mocks.backend.mockReset(); vi.stubEnv('PMS_WEB_PUBLIC_URL', 'http://localhost:3001'); });
afterEach(() => vi.unstubAllEnvs());
describe('real assignment BFF', () => {
  it('uses only Staff credentials and fixed paths, allowlists preview and command responses', async () => {
    mocks.backend.mockResolvedValueOnce(Response.json({ ...preview, private: 'hidden' }));
    const response = await GET(request(), context);
    expect(response.status).toBe(200); expect(await response.json()).toEqual(preview);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(mocks.backend.mock.calls[0][0]).toBe(`/api/v1/reservations/${reservationId}/stays/${stayId}/room-assignment?propertyId=${property}`);
    expect(mocks.backend.mock.calls[0][1].headers.authorization).toBe('Bearer synthetic-staff');
    const result = { ...scope, room_id: room, number: '203' };
    mocks.backend.mockResolvedValueOnce(Response.json({ ...result, private: 'hidden' }));
    expect(await (await PUT(request('PUT'), context)).json()).toEqual(result);
    expect(mocks.backend.mock.calls[1][1].body).toBe(JSON.stringify({ room_id: room }));
  });
  it('rejects Guest, foreign origin, extra payload and malformed params before transport', async () => {
    expect((await PUT(request('PUT', 'pms_guest_access=guest'), context)).status).toBe(401);
    expect((await PUT(request('PUT', undefined, 'http://foreign.test'), context)).status).toBe(403);
    expect((await PUT(request('PUT', undefined, undefined, { room_id: room, propertyId: property }), context)).status).toBe(400);
    expect((await GET(request(), { params: Promise.resolve({ reservationId: 'bad', stayId }) })).status).toBe(400);
    expect(mocks.backend).not.toHaveBeenCalled();
  });
  it.each([400, 401, 403, 404, 409, 500])('preserves status %i while sanitizing upstream failures', async status => {
    mocks.backend.mockResolvedValue(Response.json({ private: 'secret' }, { status }));
    const response = await PUT(request('PUT'), context);
    expect(response.status).toBe(status === 500 ? 503 : status);
    expect(JSON.stringify(await response.json())).not.toContain('secret');
  });
  it('fails closed on wrong scope, duplicate candidates and mismatched command result', async () => {
    for (const data of [{ ...preview, property_id: room }, { ...preview, rooms: [...preview.rooms, ...preview.rooms] }]) {
      mocks.backend.mockResolvedValueOnce(Response.json(data)); expect((await GET(request(), context)).status).toBe(503);
    }
    mocks.backend.mockResolvedValueOnce(Response.json({ ...scope, room_id: property, number: '203' }));
    expect((await PUT(request('PUT'), context)).status).toBe(503);
  });
});
