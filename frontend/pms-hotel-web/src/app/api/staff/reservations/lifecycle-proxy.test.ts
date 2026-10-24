import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as checkIn } from './[reservationId]/stays/[stayId]/check-in/route';
import { POST as checkOut } from './[reservationId]/stays/[stayId]/check-out/route';
const mocks = vi.hoisted(() => ({ backend: vi.fn() }));
vi.mock('@/lib/bff/staff-auth', () => ({ staffAccessCookie: 'pms_staff_access', backendStaffRequest: mocks.backend }));
const propertyId = '11111111-1111-1111-1111-111111111111', reservationId = '22222222-2222-2222-2222-222222222222';
const stayId = '33333333-3333-3333-3333-333333333333', roomId = '44444444-4444-4444-4444-444444444444';
const context = { params: Promise.resolve({ reservationId, stayId }) };
const body = { expectedStatus: 'RESERVED', expectedUpdatedAt: '2026-10-22T18:00:00.123456Z', expectedRoomId: roomId };
const receipt = { propertyId, reservationId, stayId, operationId: roomId, status: 'IN_HOUSE', completedAt: '2026-10-22T18:10:00.654321Z' };
function request(overrides: { body?: unknown; cookie?: string; origin?: string; key?: string; query?: string; contentType?: string } = {}) {
  return new NextRequest(`http://localhost:3001/api/staff/reservations/${reservationId}/stays/${stayId}/check-in?${overrides.query ?? `propertyId=${propertyId}`}`, {
    method: 'POST', headers: { cookie: overrides.cookie ?? 'pms_staff_access=staff; pms_guest_access=guest',
      origin: overrides.origin ?? 'http://localhost:3001', 'content-type': overrides.contentType ?? 'application/json',
      'idempotency-key': overrides.key ?? 'synthetic-key-001', authorization: 'Bearer browser-untrusted' },
    body: JSON.stringify(overrides.body ?? body),
  });
}
beforeEach(() => { mocks.backend.mockReset(); vi.stubEnv('PMS_WEB_PUBLIC_URL', 'http://localhost:3001'); });
afterEach(() => vi.unstubAllEnvs());
describe('Staff lifecycle BFF contract54', () => {
  it('preserves exact version/key, uses only Staff cookie and allowlists the receipt', async () => {
    mocks.backend.mockResolvedValue(Response.json({ ...receipt, secret: 'hidden' }));
    const response = await checkIn(request(), context);
    expect(response.status).toBe(200); expect(await response.json()).toEqual(receipt);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(mocks.backend.mock.calls[0][0]).toBe(`/api/v1/reservations/${reservationId}/stays/${stayId}/check-in?propertyId=${propertyId}`);
    expect(mocks.backend.mock.calls[0][1]).toMatchObject({ method: 'POST', body: JSON.stringify(body),
      headers: { authorization: 'Bearer staff', 'idempotency-key': 'synthetic-key-001' } });
  });
  it('supports checkout and a historical stay with no assigned room', async () => {
    mocks.backend.mockResolvedValue(Response.json({ ...receipt, status: 'CHECKED_OUT' }));
    const response = await checkOut(request({ body: { ...body, expectedStatus: 'IN_HOUSE', expectedRoomId: null } }), context);
    expect(response.status).toBe(200);
    expect(mocks.backend.mock.calls[0][0]).toContain('/check-out?');
  });
  it('rejects Guest-only, origin, extra input, invalid dates, duplicate scope and short keys before transport', async () => {
    for (const [options, status] of [
      [{ cookie: 'pms_guest_access=guest' }, 401], [{ origin: 'http://foreign.test' }, 403],
      [{ body: { ...body, actorId: roomId } }, 400], [{ body: { ...body, expectedUpdatedAt: '2026-02-30T00:00:00Z' } }, 400],
      [{ body: { ...body, expectedUpdatedAt: '2026-10-22T00:00:00+00:00' } }, 400],
      [{ body: { ...body, expectedRoomId: 'invalid' } }, 400], [{ body: { ...body, expectedStatus: 'IN_HOUSE' } }, 400],
      [{ key: 'short' }, 400], [{ contentType: 'text/plain' }, 400],
      [{ query: `propertyId=${propertyId}&propertyId=${propertyId}` }, 400], [{ query: 'propertyId=ALL_PROPERTIES' }, 400],
    ] as const) expect((await checkIn(request(options), context)).status).toBe(status);
    expect(mocks.backend).not.toHaveBeenCalled();
  });
  it.each(['STALE_STAY', 'OUTSTANDING_BALANCE', 'BALANCE_UNVERIFIABLE', 'ROOM_NOT_INSPECTED'])('relays safe conflict %s without upstream detail or balance', async code => {
    mocks.backend.mockResolvedValue(Response.json({ code, detail: 'private financial data', amount: 500 }, { status: 409 }));
    const response = await checkIn(request(), context);
    expect(response.status).toBe(409); expect(await response.json()).toEqual({ error: 'Stay operation unavailable', code });
  });
  it.each([400, 401, 403, 404, 409, 500])('sanitizes HTTP %i without claiming success', async status => {
    mocks.backend.mockResolvedValue(Response.json({ code: 'UNSAFE', detail: 'secret' }, { status }));
    const response = await checkIn(request(), context);
    expect(response.status).toBe(status === 500 ? 503 : status);
    expect(await response.json()).toEqual({ error: 'Stay operation unavailable' });
  });
  it('fails closed on mismatched scope, action, invalid timestamp, malformed JSON and lost transport', async () => {
    for (const value of [{ ...receipt, propertyId: roomId }, { ...receipt, stayId: roomId },
      { ...receipt, status: 'CHECKED_OUT' }, { ...receipt, completedAt: 'bad' }, { ...receipt, operationId: 'bad' }]) {
      mocks.backend.mockResolvedValueOnce(Response.json(value));
      expect((await checkIn(request(), context)).status).toBe(503);
    }
    mocks.backend.mockResolvedValueOnce(new Response('<html>private</html>'));
    expect((await checkIn(request(), context)).status).toBe(503);
    mocks.backend.mockRejectedValueOnce(new Error('private transport data'));
    expect((await checkIn(request(), context)).status).toBe(503);
  });
});
