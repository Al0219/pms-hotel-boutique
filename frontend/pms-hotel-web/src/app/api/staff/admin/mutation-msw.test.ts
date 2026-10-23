import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { NextRequest } from 'next/server';
import { mockServer } from '@/data/mocks/server';

const id = '44444444-4444-4444-8444-444444444444', org = '11111111-1111-4111-8111-111111111111';
const url = `http://staff-backend.test/api/v1/staff-admin/users/${id}`;
let route: typeof import('./users/[id]/route');
beforeEach(async () => {
  vi.resetModules(); vi.stubEnv('PMS_BACKEND_INTERNAL_URL', 'http://staff-backend.test'); vi.stubEnv('PMS_WEB_PUBLIC_URL', 'http://localhost:3001');
  route = await import('./users/[id]/route');
});
afterEach(() => vi.unstubAllEnvs());
function request() { return new NextRequest(`http://localhost:3001/api/staff/admin/users/${id}?scope=ALL_PROPERTIES`, {
  method: 'PATCH', headers: { cookie: 'pms_staff_access=synthetic-staff; pms_guest_access=synthetic-guest', origin: 'http://localhost:3001', 'content-type': 'application/json' },
  body: JSON.stringify({ workEmail: 'person@hotel.example', expectedVersion: 7 }),
}); }

it.each([
  [200, true, undefined], [200, false, undefined], [400, false, 'INVALID_REQUEST'], [401, false, 'STAFF_SESSION_REQUIRED'],
  [403, false, 'STAFF_ACCESS_DENIED'], [404, false, 'STAFF_USER_NOT_FOUND'], [409, false, 'STAFF_VERSION_CONFLICT'],
  [409, false, 'STAFF_EMAIL_CONFLICT'], [409, false, 'STAFF_STATE_CONFLICT'], [503, false, 'STAFF_WRITE_UNAVAILABLE'],
] as const)('test-only MSW fixture gives %i changed=%s code=%s, never a production fallback', async (status, changed, code) => {
  let calls = 0;
  mockServer.use(http.patch(url, async ({ request }) => {
    calls++;
    expect(request.headers.get('authorization')).toBe('Bearer synthetic-staff'); expect(request.headers.get('cookie')).toBeNull();
    expect(new URL(request.url).searchParams.get('scope')).toBe('ALL_PROPERTIES');
    expect(await request.json()).toEqual({ workEmail: 'person@hotel.example', expectedVersion: 7 });
    return status === 200 ? HttpResponse.json({ organizationId: org, staffUserId: id, version: changed ? 8 : 7, changed })
      : HttpResponse.json({ type: 'about:blank', status, code, detail: 'secret' }, { status, headers: { 'content-type': 'application/problem+json' } });
  }));
  const response = await route.PATCH(request(), { params: Promise.resolve({ id }) });
  expect(response.status).toBe(status); expect(response.headers.get('cache-control')).toBe('private, no-store'); expect(calls).toBe(1);
  const body = await response.json();
  if (status === 200) expect(body).toEqual({ organizationId: org, staffUserId: id, version: changed ? 8 : 7, changed });
  else expect(body.code).toBe(code);
  expect(body).not.toHaveProperty('detail'); expect(response.headers.get('set-cookie')).toBeNull();
});

it.each(['network', 'lost-ack'] as const)('MSW %s is an uncertain outcome with one dispatch only', async scenario => {
  let calls = 0;
  mockServer.use(http.patch(url, () => { calls++; return scenario === 'network' ? HttpResponse.error() : new HttpResponse('{broken', { headers: { 'content-type': 'application/json' } }); }));
  const response = await route.PATCH(request(), { params: Promise.resolve({ id }) });
  expect(response.status).toBe(503); expect((await response.json()).code).toBe('STAFF_WRITE_UNAVAILABLE'); expect(calls).toBe(1);
});


it.each(['membership', 'SUSPENDED', 'DISABLED'] as const)('test-only handler for %s forwards the actual method and DTO', async kind => {
  const path = kind === 'membership' ? '/membership' : '/status', method = kind === 'membership' ? 'PUT' : 'PATCH';
  const body = kind === 'membership' ? { roleCode: 'AUDITOR', propertyIds: [], expectedVersion: 7 } : { status: kind, expectedVersion: 7 };
  let calls = 0;
  const resolve = async ({ request }: { request: Request }) => {
    calls++; expect(request.method).toBe(method); expect(await request.json()).toEqual(body);
    return HttpResponse.json({ organizationId: org, staffUserId: id, version: 8, changed: true });
  };
  mockServer.use(kind === 'membership' ? http.put(url+path, resolve) : http.patch(url+path, resolve));
  const request = new NextRequest(`http://localhost:3001/api/staff/admin/users/${id}${path}?scope=ALL_PROPERTIES`, {
    method, headers: { cookie: 'pms_staff_access=synthetic-staff', origin: 'http://localhost:3001', 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const context = { params: Promise.resolve({ id }) };
  const response = kind === 'membership' ? await (await import('./users/[id]/membership/route')).PUT(request, context)
    : await (await import('./users/[id]/status/route')).PATCH(request, context);
  expect(response.status).toBe(200); expect(await response.json()).toEqual({ organizationId: org, staffUserId: id, version: 8, changed: true }); expect(calls).toBe(1);
});
