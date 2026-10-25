import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const fetchMock = vi.fn<typeof fetch>();
const id = '44444444-4444-4444-8444-444444444444', org = '11111111-1111-4111-8111-111111111111';
const info = { organizationId: org, staffUserId: id, version: 2, invitationAllowed: true, activationAllowed: false, credentialPrepared: false };
let invite: typeof import('./users/[id]/invitation/route'), consume: typeof import('../../auth/staff/invitations/consume/route'), status: typeof import('./users/[id]/status/route');
const context = { params: Promise.resolve({ id }) };
beforeEach(async () => {
  vi.resetModules(); fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('PMS_BACKEND_INTERNAL_URL', 'http://backend:8080'); vi.stubEnv('PMS_WEB_PUBLIC_URL', 'https://pms.example');
  invite = await import('./users/[id]/invitation/route'); consume = await import('../../auth/staff/invitations/consume/route'); status = await import('./users/[id]/status/route');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
function request(method = 'POST', body: unknown = { expectedVersion: 2 }, origin = 'https://pms.example', cookie = 'pms_staff_access=staff-secret; pms_guest_access=guest-secret') {
  return new NextRequest(`https://pms.example/api/staff/admin/users/${id}/invitation?scope=ALL_PROPERTIES`, { method,
    headers: { origin, cookie, 'content-type': 'application/json' }, ...(method === 'GET' ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }) });
}
it('returns only backend-derived eligibility scoped to the real Staff session', async () => {
  fetchMock.mockResolvedValue(Response.json({ ...info, token: 'secret', passwordHash: 'secret' }));
  const result = await invite.GET(request('GET'), context); expect(result.status).toBe(200); expect(await result.json()).toEqual(info);
  expect(result.headers.get('cache-control')).toContain('no-store');
  expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get('authorization')).toBe('Bearer staff-secret');
});
it('sends an invitation once with a minimal versioned acknowledgement', async () => {
  const ack = { organizationId: org, staffUserId: id, version: 3, changed: true };
  fetchMock.mockResolvedValue(Response.json({ ...ack, token: 'secret' }));
  const result = await invite.POST(request(), context); expect(await result.json()).toEqual(ack); expect(fetchMock).toHaveBeenCalledOnce();
});
it.each([{}, { expectedVersion: -1 }, { expectedVersion: 2, email: 'untrusted@hotel.test' }, '{"expectedVersion":2,"expectedVersion":3}', '{"expectedVersion":2.0}'])('rejects invalid invitation command', async body => {
  expect((await invite.POST(request('POST', body), context)).status).toBe(400); expect(fetchMock).not.toHaveBeenCalled();
});
it('requires Staff cookie and same-origin on invitation', async () => {
  expect((await invite.POST(request('POST', { expectedVersion: 2 }, 'https://evil.test'), context)).status).toBe(403);
  expect((await invite.POST(request('POST', { expectedVersion: 2 }, 'https://pms.example', 'pms_guest_access=guest'), context)).status).toBe(401); expect(fetchMock).not.toHaveBeenCalled();
});
it('consumes without forwarding Staff/Guest cookies and without creating a session', async () => {
  fetchMock.mockResolvedValue(Response.json({ credentialPrepared: true, accessToken: 'secret' }));
  const result = await consume.POST(new NextRequest('https://pms.example/api/auth/staff/invitations/consume', { method: 'POST', headers: { origin: 'https://pms.example', 'content-type': 'application/json', cookie: 'pms_guest_access=guest; pms_staff_access=admin' }, body: JSON.stringify({ token: 'x'.repeat(43), password: 'New-password1!' }) }));
  expect(await result.json()).toEqual({ credentialPrepared: true }); expect(result.headers.get('set-cookie')).toBeNull();
  const headers = new Headers(fetchMock.mock.calls[0][1]?.headers); expect(headers.get('cookie')).toBeNull(); expect(headers.get('authorization')).toBeNull(); expect(result.headers.get('cache-control')).toContain('no-store');
});
it('forwards ACTIVE reactivation while Backend remains M08 eligibility authority', async () => {
  fetchMock.mockResolvedValue(Response.json({ organizationId: org, staffUserId: id, version: 3, changed: true }));
  const result = await status.PATCH(request('PATCH', { status: 'ACTIVE', expectedVersion: 2 }), context); expect(result.status).toBe(200);
  expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({ status: 'ACTIVE', expectedVersion: 2 });
});
it.each([400, 401, 403, 404, 409, 503])('preserves sanitized invitation failure %i', async code => {
  const codes: Record<number, string> = { 400: 'INVALID_REQUEST', 401: 'STAFF_SESSION_REQUIRED', 403: 'STAFF_ACCESS_DENIED', 404: 'STAFF_USER_NOT_FOUND', 409: 'STAFF_VERSION_CONFLICT', 503: 'STAFF_WRITE_UNAVAILABLE' };
  fetchMock.mockResolvedValue(Response.json({ code: codes[code], status: code, detail: 'smtp secret' }, { status: code, headers: { 'content-type': 'application/problem+json' } }));
  const result = await invite.POST(request(), context); expect(result.status).toBe(code); expect(await result.text()).not.toContain('smtp secret');
});
it('never replays uncertain SMTP/transport failures or returns an invalid acknowledgement', async () => {
  fetchMock.mockRejectedValue(new Error('timeout'));
  expect((await invite.POST(request(), context)).status).toBe(503); expect(fetchMock).toHaveBeenCalledOnce();
});

it('returns recovery eligibility and preserves DISABLED rejection without replay', async () => {
  fetchMock.mockResolvedValueOnce(Response.json({ ...info, credentialPrepared: true, invitationAllowed: false, activationAllowed: true }));
  expect(await (await invite.GET(request('GET'), context)).json()).toEqual({ ...info, credentialPrepared: true, invitationAllowed: false, activationAllowed: true });
  fetchMock.mockResolvedValueOnce(Response.json({ code: 'STAFF_STATE_CONFLICT', status: 409, detail: 'private' }, { status: 409, headers: { 'content-type': 'application/problem+json' } }));
  const result = await status.PATCH(request('PATCH', { status: 'ACTIVE', expectedVersion: 2 }), context);
  expect(result.status).toBe(409); expect(await result.text()).not.toContain('private'); expect(fetchMock).toHaveBeenCalledTimes(2);
});
