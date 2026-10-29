import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const fetchMock = vi.fn<typeof fetch>();
const property = '22222222-2222-4222-8222-222222222222';
const org = '11111111-1111-4111-8111-111111111111';
const id = '44444444-4444-4444-8444-444444444444';
const body = { username: 'newuser', workEmail: 'new@hotel.test', roleCode: 'RECEPCION', propertyIds: [property] };
const user = { id, ...body, status: 'SUSPENDED', membershipStatus: 'ACTIVE', organizationId: org, version: 0, createdAt: '2026-10-24T00:00:00Z', updatedAt: '2026-10-24T00:00:00Z' };
let route: typeof import('./users/route');
beforeEach(async () => {
  vi.resetModules(); vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset();
  vi.stubEnv('PMS_BACKEND_INTERNAL_URL', 'http://backend:8080'); vi.stubEnv('PMS_WEB_PUBLIC_URL', 'https://pms.example');
  route = await import('./users/route');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
function request(value: unknown = body, origin = 'https://pms.example', cookie = 'pms_staff_access=secret') {
  return new NextRequest(`https://pms.example/api/staff/admin/users?scope=PROPERTY&propertyId=${property}`, {
    method: 'POST', headers: { origin, cookie, 'content-type': 'application/json' }, body: typeof value === 'string' ? value : JSON.stringify(value),
  });
}
it('creates once through Staff cookie, preserves 201 and projects credentials out', async () => {
  fetchMock.mockResolvedValue(Response.json({ ...user, passwordHash: 'secret' }, { status: 201 }));
  const response = await route.POST(request({ ...body, workEmail: ' New@Hotel.test ' }));
  expect(response.status).toBe(201); expect(response.headers.get('cache-control')).toBe('private, no-store'); expect(await response.json()).toEqual(user);
  expect(fetchMock).toHaveBeenCalledOnce(); const [url, init] = fetchMock.mock.calls[0];
  expect(String(url)).toContain('/api/v1/staff-admin/users?scope=PROPERTY'); expect(init?.method).toBe('POST');
  expect(new Headers(init?.headers).get('authorization')).toBe('Bearer secret'); expect(JSON.parse(init?.body as string)).toEqual(body);
});
it.each([400, 401, 403, 409, 503])('preserves safe error %i', async status => {
  const code = { 400: 'INVALID_REQUEST', 401: 'STAFF_SESSION_REQUIRED', 403: 'STAFF_ACCESS_DENIED', 409: 'STAFF_USERNAME_CONFLICT', 503: 'STAFF_WRITE_UNAVAILABLE' }[status];
  fetchMock.mockResolvedValue(Response.json({ code, status, detail: 'jdbc-secret' }, { status, headers: { 'content-type': 'application/problem+json' } }));
  const response = await route.POST(request()); expect(response.status).toBe(status); expect(await response.text()).not.toContain('jdbc-secret');
});
it.each([{ ...body, roleCode: 'SUPER_ADMIN' }, { ...body, username: '' }, { ...body, organizationId: org }, { ...body, propertyIds: [property, property] }, { ...body, workEmail: 'x'.repeat(51) }, '{"username":"one","username":"two","workEmail":"a@b.co","roleCode":"AUDITOR","propertyIds":[]}'])('rejects invalid body without dispatch', async value => {
  expect((await route.POST(request(value))).status).toBe(400); expect(fetchMock).not.toHaveBeenCalled();
});
it('rejects absent Staff cookie and foreign origin', async () => {
  expect((await route.POST(request(body, 'https://pms.example', 'pms_guest_access=guest'))).status).toBe(401);
  expect((await route.POST(request(body, 'https://evil.test'))).status).toBe(403); expect(fetchMock).not.toHaveBeenCalled();
});
it('does not replay uncertain transport or invalid committed reply', async () => {
  fetchMock.mockRejectedValueOnce(new Error('connection lost'));
  expect((await route.POST(request())).status).toBe(503); expect(fetchMock).toHaveBeenCalledTimes(1);
  fetchMock.mockResolvedValueOnce(Response.json({ ...user, status: 'ACTIVE' }, { status: 201 }));
  expect((await route.POST(request())).status).toBe(503); expect(fetchMock).toHaveBeenCalledTimes(2);
});
