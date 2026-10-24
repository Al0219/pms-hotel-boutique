import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const org = '11111111-1111-4111-8111-111111111111';
const property = '22222222-2222-4222-8222-222222222222';
const otherProperty = '33333333-3333-4333-8333-333333333333';
const id = '44444444-4444-4444-8444-444444444444';
const otherId = '55555555-5555-4555-8555-555555555555';
const user = () => ({ id, username: 'recepcion_ejemplo', workEmail: 'recepcion@example.test', status: 'SUSPENDED',
  roleCode: 'RECEPCION', membershipStatus: 'ACTIVE', organizationId: org, propertyIds: [property, otherProperty],
  createdAt: '2026-10-01T12:00:00Z', updatedAt: '2026-10-02T12:00:00Z', version: 0 });
const scope = () => ({ kind: 'PROPERTY', propertyIds: [property] });
const page = () => ({ organizationId: org, scope: scope(), items: [user()], limit: 50, nextCursor: null });
const detail = () => ({ organizationId: org, scope: scope(), item: user() });
const roles = () => ({ organizationId: org, items: ['SUPER_ADMIN', 'GERENCIA', 'RECEPCION', 'OPERACIONES', 'AUDITOR']
  .map(code => ({ code, name: code })) });
const fetchMock = vi.fn<typeof fetch>();
let roleRoute: typeof import('./roles/route');
let usersRoute: typeof import('./users/route');
let detailRoute: typeof import('./users/[id]/route');
const detailContext = (target = id) => ({ params: Promise.resolve({ id: target }) });

beforeEach(async () => {
  vi.resetModules(); vi.stubEnv('PMS_BACKEND_INTERNAL_URL', 'http://backend:8080');
  vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset();
  roleRoute = await import('./roles/route'); usersRoute = await import('./users/route'); detailRoute = await import('./users/[id]/route');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });
function request(query = `scope=PROPERTY&propertyId=${property}`, cookie = 'pms_staff_access=synthetic-staff; pms_guest_access=synthetic-guest', method = 'GET') {
  return new NextRequest(`http://localhost:3001/api/staff/admin/users${query ? `?${query}` : ''}`, {
    method, headers: { cookie, authorization: 'Bearer browser-untrusted', 'x-organization-id': 'browser-untrusted' },
  });
}
async function expectError(response: Response, status: number, code: string) {
  expect(response.status).toBe(status); expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(response.headers.get('content-type')).toContain('application/problem+json');
  const body = await response.json();
  expect(body).toMatchObject({ type: 'about:blank', status, code });
  expect(Object.keys(body).sort()).toEqual(['code', 'status', 'title', 'type']);
  expect(JSON.stringify(body)).not.toMatch(/secret|stack|jdbc|backend:8080|synthetic|accessToken|passwordHash/);
  expect(response.headers.get('set-cookie')).toBeNull();
}

describe('Staff administrative read BFF', () => {
  it.each(['roles', 'users', 'detail'] as const)('uses the real Staff cookie and fixed internal transport for %s', async resource => {
    const expected = resource === 'roles' ? roles() : resource === 'users' ? page() : detail();
    const raw = { ...expected, accessToken: 'secret', refreshToken: 'secret', passwordHash: 'secret' };
    if ('item' in raw) raw.item = { ...raw.item, passwordHash: 'secret' } as typeof raw.item;
    fetchMock.mockResolvedValue(Response.json(raw, { headers: { 'set-cookie': 'secret', 'x-internal': 'secret' } }));
    const req = request(resource === 'roles' ? '' : undefined);
    const response = resource === 'roles' ? await roleRoute.GET(req) : resource === 'users' ? await usersRoute.GET(req)
      : await detailRoute.GET(req, detailContext());
    expect(response.status).toBe(200); expect(await response.json()).toEqual(expected);
    expect(response.headers.get('cache-control')).toBe('private, no-store'); expect(response.headers.get('x-internal')).toBeNull();
    expect(response.headers.get('set-cookie')).toBeNull(); expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`http://backend:8080/api/v1/staff-admin/${resource === 'detail' ? `users/${id}` : resource}${resource === 'roles' ? '' : `?scope=PROPERTY&propertyId=${property}`}`);
    const forwarded = new Headers(init?.headers);
    expect(forwarded.get('authorization')).toBe('Bearer synthetic-staff'); expect(forwarded.get('cookie')).toBeNull();
    expect(forwarded.get('x-organization-id')).toBeNull(); expect(forwarded.get('accept')).toBe('application/json');
    expect(init?.method).toBe('GET'); expect(init?.cache).toBe('no-store'); expect(init?.redirect).toBe('error');
    expect(init?.signal).toBeDefined(); expect(init?.body).toBeUndefined();
  });
  it.each(['', 'pms_guest_access=guest-only', 'pms_staff_refresh=refresh-only'])('rejects missing Staff access with %s', async cookie => {
    for (const read of [() => roleRoute.GET(request('', cookie)), () => usersRoute.GET(request(undefined, cookie)),
      () => detailRoute.GET(request(undefined, cookie), detailContext())]) await expectError(await read(), 401, 'STAFF_SESSION_REQUIRED');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(['', 'scope=PROPERTY', 'scope=all_properties', `scope=ALL_PROPERTIES&propertyId=${property}`,
    'scope=PROPERTY&propertyId=bad', `scope=PROPERTY&propertyId=${property}&propertyId=${property}`,
    'scope=ALL_PROPERTIES&scope=ALL_PROPERTIES', `scope=ALL_PROPERTIES&organizationId=${org}`, 'scope=ALL_PROPERTIES&actorId=ignored',
    'scope=ALL_PROPERTIES&status=inactive', 'scope=ALL_PROPERTIES&roleCode=OWNER', 'scope=ALL_PROPERTIES&limit=0',
    'scope=ALL_PROPERTIES&limit=101', 'scope=ALL_PROPERTIES&limit=1.5', 'scope=ALL_PROPERTIES&limit=-1',
    'scope=ALL_PROPERTIES&username=%20%20', 'scope=ALL_PROPERTIES&username=line%0Abreak',
    `scope=ALL_PROPERTIES&username=${'a'.repeat(81)}`, 'scope=ALL_PROPERTIES&cursor=',
    'scope=ALL_PROPERTIES&cursor=%E3%80%80', `scope=ALL_PROPERTIES&cursor=${'a'.repeat(4097)}`,
    'scope=ALL_PROPERTIES&sort=id', 'scope=ALL_PROPERTIES&page=1', 'scope=ALL_PROPERTIES&username[]=test',
  ])('rejects noncontracted query %s without upstream', async query => {
    await expectError(await usersRoute.GET(request(query)), 400, 'INVALID_REQUEST'); expect(fetchMock).not.toHaveBeenCalled();
  });
  it('validates detail IDs and rejects list filters on detail and query on roles', async () => {
    for (const target of ['bad', '../roles', '1-1-1-1-1', `${id}?scope=ALL_PROPERTIES`])
      await expectError(await detailRoute.GET(request(), detailContext(target)), 400, 'INVALID_REQUEST');
    await expectError(await detailRoute.GET(request('scope=ALL_PROPERTIES&limit=1'), detailContext()), 400, 'INVALID_REQUEST');
    await expectError(await roleRoute.GET(request('scope=ALL_PROPERTIES')), 400, 'INVALID_REQUEST');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('passes literal search, filters and opaque cursors unchanged, with Backend pagination', async () => {
    const opaque = 'opaque+%/_-signed.cursor==';
    const username = '  recep%_!\\  ';
    const query = new URLSearchParams({ scope: 'PROPERTY', propertyId: property.toUpperCase(), username, status: 'SUSPENDED',
      roleCode: 'RECEPCION', limit: '001', cursor: opaque });
    const raw = { ...page(), limit: 1, nextCursor: 'next-opaque.cursor' };
    fetchMock.mockResolvedValue(Response.json(raw));
    const response = await usersRoute.GET(request(query.toString())); expect(response.status).toBe(200);
    expect(await response.json()).toEqual(raw);
    const upstream = new URL(String(fetchMock.mock.calls[0][0]));
    expect(upstream.searchParams.get('username')).toBe(username); expect(upstream.searchParams.get('cursor')).toBe(opaque);
    expect(upstream.searchParams.get('limit')).toBe('001'); expect(upstream.searchParams.get('propertyId')).toBe(property);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
  it('allows ALL_PROPERTIES empty only as an explicit Backend response and accepts true empty lists', async () => {
    const empty = { organizationId: org, scope: { kind: 'ALL_PROPERTIES', propertyIds: [] }, items: [], limit: 50, nextCursor: null };
    fetchMock.mockResolvedValue(Response.json(empty));
    expect(await (await usersRoute.GET(request('scope=ALL_PROPERTIES'))).json()).toEqual(empty);
    const target = { organizationId: org, scope: empty.scope, item: { ...user(), propertyIds: [], membershipStatus: 'INACTIVE' } };
    fetchMock.mockResolvedValue(Response.json(target));
    expect(await (await detailRoute.GET(request('scope=ALL_PROPERTIES'), detailContext())).json()).toEqual(target);
  });
  it.each([400, 401, 403, 404, 409, 405, 429, 500, 502, 503])('sanitizes Backend HTTP %i, preserving only contracted statuses', async status => {
    fetchMock.mockResolvedValue(Response.json({ status, code: 'not-a-contract-code', title: 'secret', detail: 'jdbc://secret', accessToken: 'secret' }, { status }));
    const expected = ({ 400: 'INVALID_REQUEST', 401: 'STAFF_SESSION_REQUIRED', 403: 'STAFF_ACCESS_DENIED', 404: 'STAFF_USER_NOT_FOUND' } as Record<number, string>)[status];
    await expectError(await usersRoute.GET(request()), expected ? status : 503, expected ?? 'STAFF_READ_UNAVAILABLE');
    expect(fetchMock).toHaveBeenCalledOnce();
  });
  it('preserves INVALID_CURSOR, including expired/context-incompatible cursors, without leaking error details', async () => {
    fetchMock.mockResolvedValue(Response.json({ type: 'about:blank', title: 'secret', status: 400, code: 'INVALID_CURSOR', stack: 'secret' }, { status: 400 }));
    await expectError(await usersRoute.GET(request('scope=ALL_PROPERTIES&cursor=opaque.signed')), 400, 'INVALID_CURSOR');
    fetchMock.mockResolvedValue(new Response('<html>secret</html>', { status: 401 }));
    await expectError(await usersRoute.GET(request()), 401, 'STAFF_SESSION_REQUIRED');
  });
  it('fails closed for malformed or mismatched pages instead of returning empty success', async () => {
    const invalid = [null, [], {}, { ...page(), organizationId: 'bad' }, { ...page(), limit: 100 },
      { ...page(), items: [user(), user()] }, { ...page(), items: [{ ...user(), organizationId: otherId }] },
      { ...page(), scope: { kind: 'PROPERTY', propertyIds: [otherProperty] } },
      { ...page(), scope: { kind: 'ALL_PROPERTIES', propertyIds: [property] } },
      { ...page(), scope: { ...scope(), propertyIds: [property, property] } },
      { ...page(), scope: { ...scope(), propertyIds: [] } }, { ...page(), items: [{ ...user(), propertyIds: [otherProperty] }] },
      { ...page(), items: [{ ...user(), propertyIds: [otherProperty, property] }] },
      { ...page(), items: [{ ...user(), status: 'UNKNOWN' }] }, { ...page(), items: [{ ...user(), roleCode: 'MOCK' }] },
      { ...page(), items: [{ ...user(), membershipStatus: 'DISABLED' }] },
      { ...page(), items: [{ ...user(), version: Number.MAX_SAFE_INTEGER + 1 }] },
      { ...page(), items: [{ ...user(), version: -1 }] }, { ...page(), items: [{ ...user(), version: 0.5 }] },
      { ...page(), items: [{ ...user(), createdAt: '2026-02-31T12:00:00Z' }] },
      { ...page(), items: [{ ...user(), updatedAt: '2025-01-01T00:00:00Z' }] },
      { ...page(), items: [{ ...user(), workEmail: '' }] }, { ...page(), items: [{ ...user(), username: ' ' }] },
      { ...page(), items: [{ ...user(), updatedAt: '2026-10-01T12:00:00.000000001Z', createdAt: '2026-10-01T12:00:00.000000002Z' }] },
      { ...page(), nextCursor: '' }, { ...page(), nextCursor: 'a'.repeat(4097) }, { ...page(), nextCursor: 'next.cursor' },
      { ...page(), nextCursor: undefined }, { ...page(), items: [] , nextCursor: 'next.cursor' }];
    for (const raw of invalid) {
      fetchMock.mockResolvedValue(Response.json(raw));
      await expectError(await usersRoute.GET(request()), 503, 'STAFF_READ_UNAVAILABLE');
    }
    fetchMock.mockResolvedValue(new Response('broken-json', { headers: { 'content-type': 'application/json' } }));
    await expectError(await usersRoute.GET(request()), 503, 'STAFF_READ_UNAVAILABLE');
    fetchMock.mockResolvedValue(new Response('{}', { headers: { 'content-type': 'text/html' } }));
    await expectError(await usersRoute.GET(request()), 503, 'STAFF_READ_UNAVAILABLE');
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expectError(await usersRoute.GET(request()), 503, 'STAFF_READ_UNAVAILABLE');
  });
  it('validates ALL_PROPERTIES as a complete authorized set without hiding partial rows', async () => {
    const raw = { ...page(), scope: { kind: 'ALL_PROPERTIES', propertyIds: [property] } };
    fetchMock.mockResolvedValue(Response.json(raw));
    await expectError(await usersRoute.GET(request('scope=ALL_PROPERTIES')), 503, 'STAFF_READ_UNAVAILABLE');
    fetchMock.mockResolvedValue(Response.json({ ...raw, scope: { kind: 'ALL_PROPERTIES', propertyIds: [property, otherProperty] } }));
    expect((await usersRoute.GET(request('scope=ALL_PROPERTIES'))).status).toBe(200);
  });
  it('requires five fixed roles and validates target identity', async () => {
    for (const raw of [{ ...roles(), items: [] }, { ...roles(), items: [...roles().items].reverse() },
      { ...roles(), items: roles().items.map(r => ({ ...r, name: '' })) },
      { ...roles(), items: [...roles().items, roles().items[0]] }]) {
      fetchMock.mockResolvedValue(Response.json(raw)); await expectError(await roleRoute.GET(request('')), 503, 'STAFF_READ_UNAVAILABLE');
    }
    fetchMock.mockResolvedValue(Response.json(detail()));
    await expectError(await detailRoute.GET(request(), detailContext(otherId)), 503, 'STAFF_READ_UNAVAILABLE');
  });
  it('checks Backend C ordering and duplicate IDs without sorting or repaginating', async () => {
    const first = { ...user(), username: '\ue000' }, second = { ...user(), id: otherId, username: '𐀀' };
    fetchMock.mockResolvedValue(Response.json({ ...page(), items: [first, second] }));
    const response = await usersRoute.GET(request()); expect(response.status).toBe(200);
    expect((await response.json()).items.map((item: { username: string }) => item.username)).toEqual(['\ue000', '𐀀']);
    fetchMock.mockResolvedValue(Response.json({ ...page(), items: [second, first] }));
    await expectError(await usersRoute.GET(request()), 503, 'STAFF_READ_UNAVAILABLE');
  });
  it('fails safely if the internal Backend is unavailable or redirects', async () => {
    fetchMock.mockRejectedValue(new Error('secret backend connection refused'));
    await expectError(await usersRoute.GET(request()), 503, 'STAFF_READ_UNAVAILABLE');
    fetchMock.mockResolvedValue(new Response(null, { status: 302, headers: { location: 'https://secret.example' } }));
    await expectError(await usersRoute.GET(request()), 503, 'STAFF_READ_UNAVAILABLE');
  });
  it('bounds internal transport to ten seconds and sanitizes timeout failure', async () => {
    const deadline = new AbortController();
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(deadline.signal);
    fetchMock.mockImplementation(async (_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('secret timeout infrastructure')), { once: true });
    }));
    try {
      const pending = usersRoute.GET(request());
      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
      expect(timeout).toHaveBeenCalledWith(10_000);
      deadline.abort();
      await expectError(await pending, 503, 'STAFF_READ_UNAVAILABLE');
    } finally { timeout.mockRestore(); }
  });
  it.each(['true', 'false'])('uses the same real BFF transport with NEXT_PUBLIC_USE_MOCK_API=%s', async flag => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', flag);
    fetchMock.mockResolvedValue(Response.json(roles()));
    const response = await roleRoute.GET(request('')); expect(response.status).toBe(200);
    expect(String(fetchMock.mock.calls[0][0])).toBe('http://backend:8080/api/v1/staff-admin/roles');
  });
  it('reports missing internal Backend configuration as unavailable without exposing environment details', async () => {
    vi.resetModules(); vi.stubEnv('PMS_BACKEND_INTERNAL_URL', '');
    const route = await import('./roles/route');
    await expectError(await route.GET(request('')), 503, 'STAFF_READ_UNAVAILABLE');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('does not refresh or change cookies server-side on a definitive upstream 401', async () => {
    fetchMock.mockResolvedValue(Response.json({ code: 'STAFF_SESSION_REQUIRED' }, { status: 401 }));
    await expectError(await detailRoute.GET(request(), detailContext()), 401, 'STAFF_SESSION_REQUIRED');
    expect(fetchMock).toHaveBeenCalledOnce(); expect(String(fetchMock.mock.calls[0][0])).not.toContain('/refresh');
  });
  it('explicitly rejects unsupported Next methods without calling Backend', async () => {
    for (const route of [roleRoute, usersRoute]) {
      for (const method of ['PATCH', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'] as const) {
        const response = route[method](); expect(response.status).toBe(405);
        expect(await response.text()).toBe(''); expect(response.headers.get('allow')).toBe(route === usersRoute ? 'GET, POST' : 'GET');
        expect(response.headers.get('cache-control')).toBe('private, no-store'); expect(response.headers.get('set-cookie')).toBeNull();
      }
    }
    for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'] as const) {
      const response = detailRoute[method](); expect(response.status).toBe(405);
      expect(response.headers.get('allow')).toBe('GET, PATCH');
      expect(response.headers.get('cache-control')).toBe('private, no-store');
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
