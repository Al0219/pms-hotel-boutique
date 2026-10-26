import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { guestHistoryPage as page, guestHistoryDetail as detail, guestHistoryReservation as item } from '@/test/real-guest-reservations-fixture';
let GET: typeof import('./route').GET;
let GET_DETAIL: typeof import('./[reservationId]/route').GET;
const fetchMock = vi.fn<typeof fetch>();
beforeAll(async () => {
  vi.resetModules(); vi.stubEnv('PMS_BACKEND_INTERNAL_URL', 'http://backend:8080');
  GET = (await import('./route')).GET; GET_DETAIL = (await import('./[reservationId]/route')).GET;
});
beforeEach(() => { vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
function request(query = '', cookie = 'pms_guest_access=guest-only; pms_staff_access=staff-never') { return new NextRequest(`http://localhost:3001/api/auth/guest/account/reservations${query}`, { headers: { cookie, authorization: 'Bearer forged-client' } }); }
function readDetail(id = item.reservationId, query = '') { return GET_DETAIL(request(query), { params: Promise.resolve({ reservationId: id }) }); }
describe('Guest reservations read BFF', () => {
  it('uses Guest cookie only, fixed paths, no browser identity, private uncached responses', async () => {
    fetchMock.mockResolvedValue(Response.json(page));
    const res = await GET(request()); expect(res.status).toBe(200); expect(await res.json()).toEqual(page);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://backend:8080/api/v1/guest-auth/account/reservations?page=0&size=20');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer guest-only'); expect(init?.cache).toBe('no-store');
    expect(init?.body).toBeUndefined();
  });
  it('reads a detail independently of the current page and strips unexpected fields', async () => {
    fetchMock.mockResolvedValue(Response.json({ ...detail, accessToken: 'secret', reservation: { ...item, notes: 'private' } }));
    const res = await readDetail(); expect(res.status).toBe(200); expect(await res.json()).toEqual(detail);
    expect(fetchMock.mock.calls[0][0]).toBe(`http://backend:8080/api/v1/guest-auth/account/reservations/${item.reservationId}`);
  });
  it('never substitutes Staff or a browser Authorization header for Guest cookie', async () => {
    expect((await GET(request('', 'pms_staff_access=staff-never'))).status).toBe(401); expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(['?accountId=other', '?propertyId=other', '?page=0&page=1', '?page=-1', '?page=1.1', '?page=2147483648', '?size=0', '?size=51'])('rejects closed-query violation %s', async query => {
    expect((await GET(request(query))).status).toBe(400); expect(fetchMock).not.toHaveBeenCalled();
  });
  it('rejects malformed detail ids and extra query parameters before contacting Backend', async () => {
    expect((await readDetail('bad-id')).status).toBe(400); expect((await readDetail(item.reservationId, '?accountId=other')).status).toBe(400); expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([400,401,404,500,503])('preserves safe upstream errors or converts technical error %i to 503', async status => {
    fetchMock.mockResolvedValue(Response.json({ token: 'never-expose' }, { status })); const res = await GET(request());
    expect(res.status).toBe(status >= 500 ? 503 : status); expect(await res.text()).not.toContain('never-expose'); expect(res.headers.get('cache-control')).toContain('no-store');
  });
  it('fails closed for malformed upstream JSON, mismatched page and unrelated detail id', async () => {
    for (const value of [{}, { ...page, page: 3 }]) { fetchMock.mockResolvedValue(Response.json(value)); expect((await GET(request())).status).toBe(503); }
    fetchMock.mockResolvedValue(Response.json({ ...detail, reservation: { ...item, reservationId: page.guestAccountId } })); expect((await readDetail()).status).toBe(503);
    fetchMock.mockRejectedValue(new Error('network')); expect((await GET(request())).status).toBe(503);
  });
});
