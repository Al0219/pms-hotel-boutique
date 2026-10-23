import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { normalizePasswordLoginEmail, passwordLoginInput } from '@/lib/login-input';

const id = '44444444-4444-4444-8444-444444444444';
const property = '22222222-2222-4222-8222-222222222222';
const org = '11111111-1111-4111-8111-111111111111';
const result = (changed = true) => ({ organizationId: org, staffUserId: id, version: changed ? 8 : 7, changed });
const fetchMock = vi.fn<typeof fetch>();
let contact: typeof import('./users/[id]/route');
let membership: typeof import('./users/[id]/membership/route');
let state: typeof import('./users/[id]/status/route');
const context = (target = id) => ({ params: Promise.resolve({ id: target }) });
beforeEach(async () => {
  vi.resetModules(); vi.stubEnv('PMS_BACKEND_INTERNAL_URL', 'http://backend:8080'); vi.stubEnv('PMS_WEB_PUBLIC_URL', 'https://pms.example');
  vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset();
  contact = await import('./users/[id]/route'); membership = await import('./users/[id]/membership/route'); state = await import('./users/[id]/status/route');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); vi.restoreAllMocks(); });
function request(body: unknown = { workEmail: 'person@hotel.example', expectedVersion: 7 }, options: {
  method?: string; suffix?: string; cookie?: string; origin?: string | null; query?: string; type?: string | null; signal?: AbortSignal;
} = {}) {
  const { method = 'PATCH', suffix = '', cookie = 'pms_staff_access=staff-cookie; pms_guest_access=guest-cookie',
    origin = 'https://pms.example', query = 'scope=ALL_PROPERTIES', type = 'application/json', signal } = options;
  const headers: Record<string, string> = { cookie, authorization: 'Bearer untrusted-browser', 'x-organization-id': 'untrusted-browser' };
  if (origin !== null) headers.origin = origin;
  if (type !== null) headers['content-type'] = type;
  return new NextRequest(`https://pms.example/api/staff/admin/users/${id}${suffix}?${query}`, {
    method, headers, body: typeof body === 'string' ? body : JSON.stringify(body), signal,
  });
}
async function error(response: Response, status: number, code: string) {
  expect(response.status).toBe(status); expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(response.headers.get('content-type')).toContain('application/problem+json');
  const data = await response.json(); expect(data).toMatchObject({ type: 'about:blank', status, code });
  expect(Object.keys(data).sort()).toEqual(['code', 'status', 'title', 'type']);
  expect(JSON.stringify(data)).not.toMatch(/secret|stack|jdbc|backend:8080|staff-cookie|guest-cookie|passwordHash|refreshToken|accessToken/);
  expect(response.headers.get('set-cookie')).toBeNull();
}
function problem(code: string, status: number) {
  return Response.json({ type: 'about:blank', title: 'secret', detail: 'jdbc://secret', status, code, accessToken: 'secret' },
    { status, headers: { 'content-type': 'application/problem+json', 'set-cookie': 'secret', 'x-internal': 'secret' } });
}

describe('Staff administrative mutations BFF', () => {
  it.each(['contact', 'membership', 'SUSPENDED', 'DISABLED'] as const)('forwards real %s with Staff cookie and a minimal projected acknowledgement', async kind => {
    fetchMock.mockResolvedValue(Response.json({ ...result(), passwordHash: 'secret', refreshToken: 'secret', accessToken: 'secret' }, { headers: { 'set-cookie': 'secret' } }));
    const body = kind === 'contact' ? { workEmail: '  Person@HOTEL.example  ', expectedVersion: 7 }
      : kind === 'membership' ? { roleCode: 'GERENCIA', propertyIds: [property.toUpperCase()], expectedVersion: 7 } : { status: kind, expectedVersion: 7 };
    const suffix = kind === 'contact' ? '' : kind === 'membership' ? '/membership' : '/status';
    const req = request(body, { method: kind === 'membership' ? 'PUT' : 'PATCH', suffix, query: `scope=PROPERTY&propertyId=${property}` });
    const response = kind === 'contact' ? await contact.PATCH(req, context()) : kind === 'membership' ? await membership.PUT(req, context()) : await state.PATCH(req, context());
    expect(response.status).toBe(200); expect(await response.json()).toEqual(result());
    expect(response.headers.get('cache-control')).toBe('private, no-store'); expect(response.headers.get('set-cookie')).toBeNull();
    expect(fetchMock).toHaveBeenCalledOnce(); const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`http://backend:8080/api/v1/staff-admin/users/${id}${suffix}?scope=PROPERTY&propertyId=${property}`);
    const headers = new Headers(init?.headers); expect(headers.get('authorization')).toBe('Bearer staff-cookie');
    expect(headers.get('cookie')).toBeNull(); expect(headers.get('x-organization-id')).toBeNull();
    expect(init?.cache).toBe('no-store'); expect(init?.redirect).toBe('error'); expect(init?.signal).toBeDefined();
    const forwarded = JSON.parse(init?.body as string);
    expect(forwarded).toEqual(kind === 'contact' ? { workEmail: 'person@hotel.example', expectedVersion: 7 }
      : kind === 'membership' ? { roleCode: 'GERENCIA', propertyIds: [property], expectedVersion: 7 } : body);
  });
  it('preserves no-op and maximum safe confirmed version', async () => {
    fetchMock.mockResolvedValueOnce(Response.json(result(false)));
    expect(await (await contact.PATCH(request(), context())).json()).toEqual(result(false));
    fetchMock.mockResolvedValueOnce(Response.json({ ...result(), version: Number.MAX_SAFE_INTEGER }));
    const response = await contact.PATCH(request({ workEmail: 'p@h.example', expectedVersion: Number.MAX_SAFE_INTEGER - 1 }), context());
    expect(response.status).toBe(200); expect((await response.json()).version).toBe(Number.MAX_SAFE_INTEGER);
  });
  it.each(['', 'pms_guest_access=guest', 'pms_staff_refresh=refresh'])('rejects without a Staff access cookie: %s', async cookie => {
    await error(await contact.PATCH(request(undefined, { cookie }), context()), 401, 'STAFF_SESSION_REQUIRED'); expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([null, 'null', 'https://other.example', 'https://pms.example.evil', 'http://pms.example', 'https://pms.example/'])('requires exact canonical Origin: %s', async origin => {
    await error(await contact.PATCH(request(undefined, { origin }), context()), 403, 'STAFF_ACCESS_DENIED'); expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(['', 'scope=PROPERTY', 'scope=all_properties', 'scope=ALL_PROPERTIES&propertyId='+property,
    'scope=PROPERTY&propertyId=bad', 'scope=ALL_PROPERTIES&scope=ALL_PROPERTIES', 'scope=ALL_PROPERTIES&organizationId='+org,
    'scope=ALL_PROPERTIES&limit=1', 'scope=ALL_PROPERTIES&cursor=opaque', 'scope=ALL_PROPERTIES&status=SUSPENDED'])('rejects invalid query %s', async query => {
    await error(await contact.PATCH(request(undefined, { query }), context()), 400, 'INVALID_REQUEST'); expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(['bad', '../roles', `${id}?scope=ALL_PROPERTIES`, '1-1-1-1-1'])('rejects invalid path ID %s', async target => {
    await error(await contact.PATCH(request(), context(target)), 400, 'INVALID_REQUEST'); expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([
    '{}', 'null', '[]', '{broken', '{"workEmail":"p@h.example","expectedVersion":7} {}',
    '{"workEmail":"p@h.example","expectedVersion":7,"username":"change"}',
    '{"workEmail":"p@h.example","expectedVersion":7,"organizationId":"ignored"}',
    '{"workEmail":"a@b","workEmail":"c@d","expectedVersion":7}',
    '{"workEmail":"a@b","\\u0077orkEmail":"c@d","expectedVersion":7}',
    '{"workEmail":"a@b","expectedVersion":7.0}', '{"workEmail":"a@b","expectedVersion":7e0}',
    '{"workEmail":"a@b","expectedVersion":"7"}', '{"workEmail":"a@b","expectedVersion":-1}',
    '{"workEmail":"a@b","expectedVersion":9007199254740991}', '{"workEmail":"a@b","expectedVersion":null}',
    { workEmail: 'p@h.example' }, { workEmail: null, expectedVersion: 7 }, { workEmail: 'a..b@h.example', expectedVersion: 7 },
    { workEmail: 'a'.repeat(46)+'@a.co', expectedVersion: 7 },
  ])('rejects malformed/noncontracted contact %j', async body => {
    await error(await contact.PATCH(request(body), context()), 400, 'INVALID_REQUEST'); expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(['', 'ACTIVE', 'active', 'UNKNOWN'])('rejects unsupported state %s', async status => {
    await error(await state.PATCH(request({ status, expectedVersion: 7 }, { suffix: '/status' }), context()), 400, 'INVALID_REQUEST'); expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([
    { roleCode: 'SUPER_ADMIN', propertyIds: [property], expectedVersion: 7 },
    { roleCode: 'OWNER', propertyIds: [property], expectedVersion: 7 },
    { roleCode: 'RECEPCION', propertyIds: [property, property.toUpperCase()], expectedVersion: 7 },
    { roleCode: 'RECEPCION', propertyIds: ['bad'], expectedVersion: 7 },
    { roleCode: 'RECEPCION', propertyIds: property, expectedVersion: 7 },
    { roleCode: 'RECEPCION', propertyIds: [property], expectedVersion: 7, membershipStatus: 'ACTIVE' },
  ])('rejects invalid membership %j', async body => {
    await error(await membership.PUT(request(body, { method: 'PUT', suffix: '/membership' }), context()), 400, 'INVALID_REQUEST'); expect(fetchMock).not.toHaveBeenCalled();
  });
  it('allows empty property replacement for Backend to apply M07, without inventing a default', async () => {
    fetchMock.mockResolvedValue(Response.json(result()));
    const response = await membership.PUT(request({ roleCode: 'AUDITOR', propertyIds: [], expectedVersion: 7 }, { method: 'PUT' }), context());
    expect(response.status).toBe(200); expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string).propertyIds).toEqual([]);
  });
  it.each([null, 'text/plain', 'application/jsonp', 'application/*'])('rejects media type %s with415', async type => {
    await error(await contact.PATCH(request(undefined, { type }), context()), 415, 'INVALID_REQUEST'); expect(fetchMock).not.toHaveBeenCalled();
  });
  it('bounds actual streamed UTF-8 bytes rather than trusting Content-Length', async () => {
    await error(await contact.PATCH(request(' '.repeat(65537)), context()), 413, 'INVALID_REQUEST');
    await error(await contact.PATCH(request(JSON.stringify({ workEmail: 'é'.repeat(33000), expectedVersion: 7 })), context()), 413, 'INVALID_REQUEST'); expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([
    ['INVALID_REQUEST', 400], ['STAFF_SESSION_REQUIRED', 401], ['STAFF_ACCESS_DENIED', 403], ['STAFF_USER_NOT_FOUND', 404],
    ['STAFF_VERSION_CONFLICT', 409], ['STAFF_EMAIL_CONFLICT', 409], ['STAFF_STATE_CONFLICT', 409],
    ['INVALID_REQUEST', 413], ['INVALID_REQUEST', 415], ['STAFF_WRITE_UNAVAILABLE', 503],
  ] as const)('preserves contracted %s/%i while sanitizing every payload/header', async (code, status) => {
    fetchMock.mockResolvedValue(problem(code, status)); await error(await contact.PATCH(request(), context()), status, code);
    expect(fetchMock).toHaveBeenCalledOnce(); expect(String(fetchMock.mock.calls[0][0])).not.toContain('/refresh');
  });
  it.each([
    { ...result(), staffUserId: property }, { ...result(), version: 7 }, { ...result(false), version: 8 },
    { ...result(), changed: 'true' }, { ...result(), organizationId: 'invalid' }, { ...result(), version: 8.1 },
    {}, [], null,
  ])('treats incoherent acknowledgement %j as an uncertain write without retry', async raw => {
    fetchMock.mockResolvedValue(Response.json(raw)); await error(await contact.PATCH(request(), context()), 503, 'STAFF_WRITE_UNAVAILABLE'); expect(fetchMock).toHaveBeenCalledOnce();
  });
  it.each([Response.json({ status: 409, code: 'UNKNOWN', detail: 'secret' }, { status: 409 }),
    new Response('<html>secret</html>', { status: 502 }), new Response('{broken', { headers: { 'content-type': 'application/json' } }),
    Response.json(result(), { status: 201 }), problem('STAFF_ACCESS_DENIED', 409)])('sanitizes invalid error/status/body without claiming rollback', async upstream => {
    fetchMock.mockResolvedValue(upstream.clone()); await error(await contact.PATCH(request(), context()), 503, 'STAFF_WRITE_UNAVAILABLE'); expect(fetchMock).toHaveBeenCalledOnce();
  });
  it('never retries a connection error, expired session, redirect failure or lost reply', async () => {
    for (const failure of [new TypeError('secret infrastructure'), new DOMException('secret', 'AbortError'), new TypeError('redirect to secret')]) {
      fetchMock.mockReset().mockRejectedValue(failure); await error(await contact.PATCH(request(), context()), 503, 'STAFF_WRITE_UNAVAILABLE'); expect(fetchMock).toHaveBeenCalledOnce();
    }
  });
  it('aborts at10s and makes exactly one dispatch with no refresh', async () => {
    const timeout = new AbortController(); vi.spyOn(AbortSignal, 'timeout').mockReturnValueOnce(timeout.signal);
    fetchMock.mockImplementationOnce((_url, init) => new Promise((_resolve, reject) => {
      init!.signal!.addEventListener('abort', () => reject(new DOMException('timeout', 'AbortError')), { once: true });
      timeout.abort();
    }));
    await error(await contact.PATCH(request(), context()), 503, 'STAFF_WRITE_UNAVAILABLE'); expect(AbortSignal.timeout).toHaveBeenCalledWith(10000); expect(fetchMock).toHaveBeenCalledOnce();
    vi.restoreAllMocks();
  });
  it('honors request cancellation without a second dispatch', async () => {
    const abort = new AbortController(); fetchMock.mockImplementationOnce((_url, init) => new Promise((_resolve, reject) => {
      init!.signal!.addEventListener('abort', () => reject(new DOMException('cancel', 'AbortError')), { once: true }); abort.abort();
    }));
    await error(await contact.PATCH(request(undefined, { signal: abort.signal }), context()), 503, 'STAFF_WRITE_UNAVAILABLE'); expect(fetchMock).toHaveBeenCalledOnce();
  });
  it('rejects unsupported route methods explicitly and without a Backend request', async () => {
    for (const route of [contact, state]) for (const method of ['POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'] as const) {
      const response = route[method](); expect(response.status).toBe(405); expect(await response.text()).toBe('');
      expect(response.headers.get('allow')).toBe(route === contact ? 'GET, PATCH' : 'PATCH'); expect(response.headers.get('cache-control')).toBe('private, no-store');
    }
    for (const method of ['GET', 'POST', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const) {
      const response = membership[method](); expect(response.status).toBe(405); expect(response.headers.get('allow')).toBe('PUT');
    }
    expect(state.GET().status).toBe(405); expect(fetchMock).not.toHaveBeenCalled();
  });
  it('does not log cookies, rejected bodies or untrusted upstream details', async () => {
    const spies = [vi.spyOn(console, 'log'), vi.spyOn(console, 'warn'), vi.spyOn(console, 'error'), vi.spyOn(console, 'debug')];
    for (const spy of spies) spy.mockImplementation(() => undefined);
    fetchMock.mockResolvedValueOnce(problem('STAFF_VERSION_CONFLICT', 409));
    await error(await contact.PATCH(request(), context()), 409, 'STAFF_VERSION_CONFLICT');
    fetchMock.mockRejectedValueOnce(new Error('jdbc://secret accessToken=secret'));
    await error(await contact.PATCH(request(), context()), 503, 'STAFF_WRITE_UNAVAILABLE');
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });
  it('keeps email acceptance identical to the existing login, with no additional ASCII restriction', async () => {
    for (const raw of ['  Person@hotel.example  ', '\r\np@hotel.example\n', '\u212A@hotel.example', '\u00a0p@hotel.example\u00a0', 'a'.repeat(45)+'@a.co']) {
      fetchMock.mockResolvedValue(Response.json(result()));
      const response = await contact.PATCH(request({ workEmail: raw, expectedVersion: 7 }), context()); expect(response.status).toBe(200);
      expect(JSON.parse(fetchMock.mock.lastCall![1]?.body as string).workEmail).toBe(passwordLoginInput(raw, 'Known-password1!')!.email);
      expect(normalizePasswordLoginEmail(raw)).toBe(passwordLoginInput(raw, 'Known-password1!')!.email);
    }
  });
});
