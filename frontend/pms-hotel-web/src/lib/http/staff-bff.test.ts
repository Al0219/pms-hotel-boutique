import { HttpResponse, http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/data/mocks/server';
import { setAuthToken } from './interceptors';
import { staffBffRead } from './staff-bff';

afterEach(() => setAuthToken(null));

describe('Administrative reads reuse the existing Staff restoration', () => {
  it('shares one refresh across an admin read and a concurrent Staff session read', async () => {
    let valid = false, initial = 0;
    let bothStarted!: () => void, release!: () => void;
    const both = new Promise<void>(resolve => { bothStarted = resolve; });
    const rotation = new Promise<void>(resolve => { release = resolve; });
    const admin = { organizationId: 'org-fixture', items: [] };
    const session = { staffUserId: 'staff-fixture', sessionId: 'session-fixture' };
    const seenHeaders: Headers[] = [];
    const serve = (request: Request, body: typeof admin | typeof session) => {
      seenHeaders.push(request.headers);
      if (++initial === 2) bothStarted();
      return valid ? HttpResponse.json(body) : new HttpResponse(null, { status: 401 });
    };
    const refresh = vi.fn(async () => { await rotation; valid = true; return HttpResponse.json({ refreshed: true }); });
    mockServer.use(http.get('*/api/staff/admin/roles', ({ request }) => serve(request, admin)),
      http.get('*/api/auth/staff/session', ({ request }) => serve(request, session)),
      http.post('*/api/auth/staff/refresh', refresh));
    setAuthToken('synthetic-foreign-token');
    const first = staffBffRead('/api/staff/admin/roles'), second = staffBffRead('/api/auth/staff/session');
    await both; await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1)); release();
    expect(await Promise.all([first, second])).toEqual([admin, session]);
    expect(seenHeaders).toHaveLength(4); expect(seenHeaders.every(headers => !headers.has('authorization'))).toBe(true);
    expect(refresh).toHaveBeenCalledOnce();
  });
  it('stops after one refresh and one retry without touching Guest', async () => {
    const admin = vi.fn(() => new HttpResponse(null, { status: 401 }));
    const refresh = vi.fn(() => HttpResponse.json({ refreshed: true }));
    const guest = vi.fn(() => HttpResponse.json({ authenticated: true }));
    mockServer.use(http.get('*/api/staff/admin/users', admin), http.post('*/api/auth/staff/refresh', refresh),
      http.get('*/api/auth/guest/session', guest), http.post('*/api/auth/guest/refresh', guest));
    await expect(staffBffRead('/api/staff/admin/users?scope=ALL_PROPERTIES')).rejects.toMatchObject({ status: 401 });
    expect(admin).toHaveBeenCalledTimes(2); expect(refresh).toHaveBeenCalledOnce(); expect(guest).not.toHaveBeenCalled();
  });
  it.each([400, 403, 404, 503])('does not refresh or reinterpret an admin %i as signed-out', async status => {
    const refresh = vi.fn(() => HttpResponse.json({ refreshed: true }));
    const body = { type: 'about:blank', status, code: status === 400 ? 'INVALID_CURSOR' : 'SAFE_ERROR_FIXTURE' };
    mockServer.use(http.get('*/api/staff/admin/users', () => HttpResponse.json(body, { status })),
      http.post('*/api/auth/staff/refresh', refresh));
    await expect(staffBffRead('/api/staff/admin/users?scope=ALL_PROPERTIES')).rejects.toMatchObject({ status, responseData: body });
    expect(refresh).not.toHaveBeenCalled();
  });
  it('does not restore a cancelled admin read or change its opaque cursor', async () => {
    const refresh = vi.fn(() => HttpResponse.json({ refreshed: true }));
    let received: string | null = null;
    const opaque = 'opaque+%/signed.cursor==';
    mockServer.use(http.get('*/api/staff/admin/users', ({ request }) => {
      received = new URL(request.url).searchParams.get('cursor'); return HttpResponse.json({ nextCursor: opaque });
    }), http.post('*/api/auth/staff/refresh', refresh));
    expect(await staffBffRead(`/api/staff/admin/users?scope=ALL_PROPERTIES&cursor=${encodeURIComponent(opaque)}`)).toEqual({ nextCursor: opaque });
    expect(received).toBe(opaque);
    const controller = new AbortController(); controller.abort();
    await expect(staffBffRead('/api/staff/admin/users?scope=ALL_PROPERTIES', controller.signal)).rejects.toThrow();
    expect(refresh).not.toHaveBeenCalled();
  });
});
