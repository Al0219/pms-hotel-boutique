import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { GET } from './creation-options/route';
const mocks = vi.hoisted(() => ({ backend: vi.fn() }));
vi.mock('@/lib/bff/staff-auth', () => ({ staffAccessCookie: 'pms_staff_access', backendStaffRequest: mocks.backend }));
const propertyId = '11111111-1111-1111-1111-111111111111', roomTypeId = '22222222-2222-2222-2222-222222222222';
const body = { arrival: '2035-01-01', departure: '2035-01-03', rooms: 2, roomTypeId, ratePlanId: 'DEMO_STANDARD', currency: 'GTQ', clientTotalMinor: 260000,
  guest: { firstName: 'Ana', lastName: 'Perez', email: 'ana@example.test', phone: '+502 5555 5555' }, notes: null };
const receipt = { operationId: roomTypeId, propertyId, reservationId: '33333333-3333-3333-3333-333333333333', completedAt: '2035-01-01T12:00:00Z' };
const quote = { propertyId, arrival: body.arrival, departure: body.departure, rooms: 2, nights: 2, currency: 'GTQ', options: [
  { roomTypeId, roomTypeName: 'Standard', ratePlanId: 'DEMO_STANDARD', availableRooms: 3, nightlyMinor: 65000, totalMinor: 260000 },
] };
function request(quote = false, value: unknown = body, cookie = 'pms_staff_access=staff-only; pms_guest_access=guest-only', origin = 'http://localhost:3001', suffix = '') {
  return new NextRequest(`http://localhost:3001/api/staff/reservations${quote ? '/creation-options' : ''}?propertyId=${propertyId}${quote ? '&arrival=2035-01-01&departure=2035-01-03&rooms=2' : ''}${suffix}`, {
    method: quote ? 'GET' : 'POST', headers: { cookie, origin, 'content-type': 'application/json', 'idempotency-key': 'exact-request-key' }, ...(!quote ? { body: JSON.stringify(value) } : {}),
  });
}
beforeEach(() => { mocks.backend.mockReset(); vi.stubEnv('PMS_WEB_PUBLIC_URL', 'http://localhost:3001'); });
afterEach(() => vi.unstubAllEnvs());
describe('Staff booking BFF', () => {
  it('forwards only Staff credentials and preserves the idempotent body/key', async () => {
    mocks.backend.mockResolvedValue(Response.json({ ...receipt, token: 'hidden' }, { status: 201 }));
    const response = await POST(request());
    expect(response.status).toBe(201); expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toEqual(receipt);
    const [path, init] = mocks.backend.mock.calls[0];
    expect(path).toBe(`/api/v1/reservations?propertyId=${propertyId}`);
    expect(init.headers.authorization).toBe('Bearer staff-only'); expect(init.headers['idempotency-key']).toBe('exact-request-key');
    expect(JSON.parse(init.body)).toEqual(body); expect(JSON.stringify(init)).not.toContain('guest-only');
  });
  it('reads scoped offers without persisting a quote or fabricating capacity', async () => {
    mocks.backend.mockResolvedValue(Response.json(quote)); const result = await GET(request(true));
    expect(result.status).toBe(200); expect(await result.json()).toEqual(quote);
  });
  it('rejects Guest-only cookies, invalid origin and scope additions before upstream', async () => {
    expect((await POST(request(false,body,'pms_guest_access=guest'))).status).toBe(401);
    expect((await POST(request(false,body,undefined,'https://foreign.example'))).status).toBe(403);
    expect((await POST(request(false,body,undefined,undefined,'&scope=ALL_PROPERTIES'))).status).toBe(400);
    expect((await GET(request(true,body,undefined,undefined,`&propertyId=${roomTypeId}`))).status).toBe(400);
    expect(mocks.backend).not.toHaveBeenCalled();
  });
  it.each([{ ...body, actorId: propertyId }, { ...body, rooms: 0 }, { ...body, clientTotalMinor: 1.5 },
    { ...body, guest: { ...body.guest, cardNumber: 'never-accepted' } }, { ...body, guest: { ...body.guest, firstName: '' } }])('rejects unsupported or malformed input', async value => {
    expect((await POST(request(false,value))).status).toBe(400); expect(mocks.backend).not.toHaveBeenCalled();
  });
  it.each(['NO_AVAILABILITY','PRICE_CHANGED','IDEMPOTENCY_KEY_REUSED'])('retains safe conflict %s without upstream internals', async code => {
    mocks.backend.mockResolvedValue(Response.json({ code, detail: 'private SQL' }, { status: 409 }));
    const response = await POST(request()); expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'Staff booking unavailable', code });
  });
  it('fails closed on a receipt for another property or technical failure', async () => {
    mocks.backend.mockResolvedValue(Response.json({ ...receipt, propertyId: roomTypeId }, { status: 201 }));
    expect((await POST(request())).status).toBe(503);
    mocks.backend.mockResolvedValue(Response.json({ detail: 'internal SQL' }, { status: 500 }));
    const response = await POST(request()); expect(response.status).toBe(503); expect(await response.text()).not.toContain('SQL');
  });
});
