import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// GET exercises its real BFF/transport. POST has separate creation-proxy tests.
vi.mock('./creation-proxy', () => ({ proxyStaffBooking: vi.fn() }));


const fetchMock = vi.fn<typeof fetch>();
let GET: typeof import('./route').GET;
let detailGET: typeof import('./[reservationId]/route').GET;
const fixture = { reservationId: '11111111-1111-1111-1111-111111111111', propertyId: '22222222-2222-2222-2222-222222222222',
  confirmationCode: 'REAL-BOOKING', status: 'CONFIRMED', source: 'WEB_DIRECTA', sourceReference: null, currency: 'GTQ', createdAt: '2026-10-08T10:00:00Z',
  responsibleGuest: { profileId: '33333333-3333-3333-3333-333333333333', firstName: 'Real', lastName: 'Responsible' }, stays: [] };
function detailFixture() {
  const stay = { stayId: '44444444-4444-4444-4444-444444444444', arrival: '2026-11-01', departure: '2026-11-03',
    status: 'RESERVED', updatedAt: '2026-10-22T18:00:00.123456Z',
    roomType: { roomTypeId: '55555555-5555-5555-5555-555555555555', code: 'DLX', name: 'Deluxe' }, room: null };
  return { ...fixture, stays: [stay], details: { updatedAt: '2026-10-28T20:00:00.123456Z', notes: 'Llegada tardía registrada.',
    contact: { profileId: fixture.responsibleGuest.profileId, email: 'responsible@example.test', phone: '+502 5555 5555',
      documentType: 'DPI', documentNumberMasked: '•••• 0123', preferredLanguage: 'es' },
    stays: [{ stayId: stay.stayId, occupants: [{ profileId: '66666666-6666-6666-6666-666666666666', fullName: 'Actual Occupant', primary: true }] }] } };
}
beforeEach(async () => {
  vi.resetModules(); vi.stubEnv('PMS_BACKEND_INTERNAL_URL', 'http://backend:8080');
  vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset();
  GET = (await import('./route')).GET; detailGET = (await import('./[reservationId]/route')).GET;
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
function request(query = `propertyId=${fixture.propertyId}`, cookie = 'pms_staff_access=synthetic-staff; pms_guest_access=synthetic-guest') {
  return new NextRequest(`http://localhost/api/staff/reservations?${query}`, { headers: { cookie, authorization: 'Bearer client-supplied' } });
}

describe('Staff reservations BFF', () => {
  it('passes an optional recorded country and rejects malformed values while accepting older contact responses', async () => {
    for (const country of ['GT', null, undefined]) {
      const dto = detailFixture();
      const details = { ...dto.details, contact: { ...dto.details.contact, ...(country !== undefined && { country }) } };
      fetchMock.mockResolvedValueOnce(Response.json({ ...dto, details }));
      const response = await detailGET(request(), { params: Promise.resolve({ reservationId: dto.reservationId }) });
      expect(response.status).toBe(200); expect((await response.json()).details).toEqual(details);
    }
    const dto = detailFixture();
    fetchMock.mockResolvedValueOnce(Response.json({ ...dto, details: { ...dto.details, contact: { ...dto.details.contact, country: 'Guatemala<script>' } } }));
    expect((await detailGET(request(), { params: Promise.resolve({ reservationId: dto.reservationId }) })).status).toBe(503);
  });
  it('allowlists the expanded detail, removes upstream secrets and keeps additional contact out of the list', async () => {
    const dto = detailFixture();
    const extra = { ...dto, details: { ...dto.details, accountToken: 'do-not-relay', contact: {
      ...dto.details!.contact, documentNumber: '1234567890123', guestAccountId: 'not-a-profile' } } };
    fetchMock.mockResolvedValueOnce(Response.json(extra));
    const response = await detailGET(request(), { params: Promise.resolve({ reservationId: dto.reservationId }) });
    expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('private, no-store');
    const body = await response.json(); expect(body.details).toEqual(dto.details);
    for (const secret of ['do-not-relay', '1234567890123', 'not-a-profile']) expect(JSON.stringify(body)).not.toContain(secret);
    fetchMock.mockResolvedValueOnce(Response.json([extra]));
    const list = await (await GET(request())).json(); expect(list[0]).not.toHaveProperty('details');
    expect(JSON.stringify(list)).not.toContain('responsible@example.test');
  });
  it.each(['contact', 'stay', 'document'])('rejects incompatible detail information: %s', async scenario => {
    const dto = detailFixture();
    if (scenario === 'contact') dto.details!.contact!.profileId = dto.propertyId;
    if (scenario === 'stay') dto.details!.stays[0].stayId = dto.propertyId;
    if (scenario === 'document') dto.details!.contact!.documentNumberMasked = 'full-document';
    fetchMock.mockResolvedValueOnce(Response.json(dto));
    const response = await detailGET(request(), { params: Promise.resolve({ reservationId: dto.reservationId }) });
    expect(response.status).toBe(503); expect(await response.json()).toEqual({ error: 'Reservation read unavailable' });
  });
  it('preserves an exact stay version and rejects missing versions from an incompatible Backend', async () => {
    const real = { ...fixture, stays: [{ stayId: '44444444-4444-4444-4444-444444444444',
      arrival: '2026-11-01', departure: '2026-11-03', status: 'RESERVED', updatedAt: '2026-10-22T18:00:00.123456Z',
      roomType: { roomTypeId: '55555555-5555-5555-5555-555555555555', code: 'DLX', name: 'Deluxe' }, room: null }] };
    fetchMock.mockResolvedValueOnce(Response.json(real));
    const response = await detailGET(request(), { params: Promise.resolve({ reservationId: real.reservationId }) });
    expect(response.status).toBe(200);
    expect((await response.json()).stays[0].updatedAt).toBe(real.stays[0].updatedAt);
    fetchMock.mockResolvedValueOnce(Response.json({ ...real, stays: [{ ...real.stays[0], updatedAt: undefined }] }));
    expect((await detailGET(request(), { params: Promise.resolve({ reservationId: real.reservationId }) })).status).toBe(503);
  });
  it('uses only the Staff cookie, fixed target and no-store with an allowlisted response', async () => {
    fetchMock.mockResolvedValue(Response.json([{ ...fixture, accessToken: 'secret', responsibleGuest: { ...fixture.responsibleGuest, email: 'private' } }]));
    const response = await GET(request());
    expect(response.status).toBe(200); expect(await response.json()).toEqual([fixture]);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`http://backend:8080/api/v1/reservations?propertyId=${fixture.propertyId}`);
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer synthetic-staff');
    expect(init?.cache).toBe('no-store');
  });
  it('supports detail with promised params and empty list', async () => {
    fetchMock.mockResolvedValueOnce(Response.json(fixture));
    const response = await detailGET(request(), { params: Promise.resolve({ reservationId: fixture.reservationId }) });
    expect(await response.json()).toEqual(fixture);
    expect(fetchMock.mock.calls[0][0]).toContain(`/reservations/${fixture.reservationId}?propertyId=`);
    fetchMock.mockResolvedValueOnce(Response.json([])); expect(await (await GET(request())).json()).toEqual([]);
  });
  it('rejects Guest-only and missing credentials without a backend call', async () => {
    for (const cookie of ['', 'pms_guest_access=synthetic-guest']) expect((await GET(request(undefined, cookie))).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(['', 'propertyId=invalid', `propertyId=${fixture.propertyId}&propertyId=${fixture.propertyId}`, `propertyId=${fixture.propertyId}&scope=ALL_PROPERTIES`])('rejects invalid filters %s', async query => {
    expect((await GET(request(query))).status).toBe(400); expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([400, 401, 403, 404, 500])('preserves meaningful status %i and sanitizes errors', async status => {
    fetchMock.mockResolvedValue(Response.json({ secret: 'do-not-relay' }, { status }));
    const response = await GET(request());
    expect(response.status).toBe(status === 500 ? 503 : status);
    expect(JSON.stringify(await response.json())).not.toContain('do-not-relay');
  });
  it('fails closed on invalid JSON, cross-property data or mismatched detail ID', async () => {
    fetchMock.mockResolvedValueOnce(new Response('broken'));
    expect((await GET(request())).status).toBe(503);
    fetchMock.mockResolvedValueOnce(Response.json([{ ...fixture, propertyId: '88888888-8888-8888-8888-888888888888' }]));
    expect((await GET(request())).status).toBe(503);
    fetchMock.mockResolvedValueOnce(Response.json(fixture));
    expect((await detailGET(request(), { params: Promise.resolve({ reservationId: '88888888-8888-8888-8888-888888888888' }) })).status).toBe(503);
  });
});
