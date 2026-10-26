import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { guestLinkRequestId } from '@/test/real-guest-reservations-fixture';
let challenge: typeof import('./challenges/route').POST;
let verify: typeof import('./verify/route').POST;
const fetchMock = vi.fn<typeof fetch>();
beforeAll(async () => {
  vi.resetModules(); vi.stubEnv('PMS_BACKEND_INTERNAL_URL', 'http://backend:8080');
  challenge = (await import('./challenges/route')).POST; verify = (await import('./verify/route')).POST;
});
beforeEach(() => { vi.stubEnv('PMS_WEB_PUBLIC_URL', 'http://localhost:3001'); vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
function request(body: unknown, headers: Record<string,string> = {}, suffix = '') {
  return new NextRequest(`http://localhost:3001/api/auth/guest/reservation-links${suffix}`, { method: 'POST', headers: { cookie: 'pms_guest_access=guest-only; pms_staff_access=staff-never', origin: 'http://localhost:3001', 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
}
describe('Guest C3 linking BFF', () => {
  it('preserves opaque 202 without promising delivery or exposing upstream secrets', async () => {
    fetchMock.mockResolvedValue(Response.json({ requestId: guestLinkRequestId, otp: 'never', email: 'private' }, { status: 202 }));
    const res = await challenge(request({ confirmationCode: 'HB-2026-08421' })); expect(res.status).toBe(202); expect(await res.json()).toEqual({ requestId: guestLinkRequestId });
    const [url, init] = fetchMock.mock.calls[0]; expect(url).toBe('http://backend:8080/api/v1/guest-auth/reservation-links/challenges');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer guest-only'); expect(init?.body).toBe(JSON.stringify({ confirmationCode: 'HB-2026-08421' })); expect(res.headers.get('cache-control')).toContain('no-store');
  });
  it('returns the actual bodyless 204 rather than fabricating a reservation id', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const res = await verify(request({ requestId: guestLinkRequestId, otp: '12345678' })); expect(res.status).toBe(204); expect(await res.text()).toBe('');
    expect(fetchMock.mock.calls[0][0]).toBe('http://backend:8080/api/v1/guest-auth/reservation-links/verify');
  });
  it('requires Guest cookie, same origin and JSON', async () => {
    expect((await challenge(request({ confirmationCode: 'HB' }, { cookie: 'pms_staff_access=staff' }))).status).toBe(401);
    for (const origin of ['', 'https://attacker.test']) expect((await challenge(request({ confirmationCode: 'HB' }, { origin }))).status).toBe(403);
    expect((await challenge(request('confirmationCode=HB', { 'content-type': 'text/plain' }))).status).toBe(400); expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([{}, [], null, 'bad json', { confirmationCode: '' }, { confirmationCode: 'a'.repeat(17) }, { confirmationCode: 'HB\n' }, { confirmationCode: 'HB', accountId: 'other' }, { confirmationCode: 'HB', email: 'other@example.test' }])('rejects malformed or extended challenge body %#', async body => {
    expect((await challenge(request(body))).status).toBe(400); expect(fetchMock).not.toHaveBeenCalled();
  });
  it('bounds the body, rejects query parameters and validates verify keys and format', async () => {
    expect((await challenge(request(' '.repeat(3000)))).status).toBe(400);
    expect((await challenge(request({ confirmationCode: 'HB' }, {}, '?extra=1'))).status).toBe(400);
    for (const body of [{ requestId: 'bad', otp: '12345678' }, { requestId: guestLinkRequestId, otp: '123' }, { requestId: guestLinkRequestId, otp: '12345678', accountId: 'other' }]) expect((await verify(request(body))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([400,401,403,422,429,500])('keeps safe error %i generic', async status => {
    fetchMock.mockResolvedValue(Response.json({ otp: 'never', reservationId: 'private' }, { status })); const res = await verify(request({ requestId: guestLinkRequestId, otp: '12345678' }));
    expect(res.status).toBe(status === 500 ? 503 : status); expect(await res.text()).not.toMatch(/never|private/);
  });
  it('does not accept an incorrect success status, invalid challenge or network failure', async () => {
    fetchMock.mockResolvedValue(Response.json({}, { status: 200 })); expect((await verify(request({ requestId: guestLinkRequestId, otp: '12345678' }))).status).toBe(503);
    fetchMock.mockResolvedValue(Response.json({ requestId: 'bad' }, { status: 202 })); expect((await challenge(request({ confirmationCode: 'HB' }))).status).toBe(503);
    fetchMock.mockRejectedValue(new Error('network')); expect((await challenge(request({ confirmationCode: 'HB' }))).status).toBe(503);
  });
});
