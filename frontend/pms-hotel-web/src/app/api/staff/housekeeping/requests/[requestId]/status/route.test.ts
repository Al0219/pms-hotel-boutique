import { NextRequest } from 'next/server';
import { beforeEach, expect, it, vi } from 'vitest';
const backend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/bff/staff-auth', () => ({ backendStaffRequest: backend, staffAccessCookie: 'pms_staff_access' }));
import { PUT } from './route';
const propertyId = '22222222-2222-4222-8222-222222222222';
const requestId = '33333333-3333-4333-8333-333333333333';
const payload = { expectedUpdatedAt: '2030-01-01T08:00:00Z', targetStatus: 'IN_PROGRESS' };
const result = { id: requestId, propertyId, status: 'IN_PROGRESS', updatedAt: '2030-01-01T09:00:00Z' };
const context = { params: Promise.resolve({ requestId }) };
function request(body: unknown = payload, cookie = 'pms_staff_access=synthetic-staff; pms_guest_access=synthetic-guest', origin = 'http://localhost:3001', query = `propertyId=${propertyId}`) {
  return new NextRequest(`http://localhost:3001/api/staff/housekeeping/requests/${requestId}/status?${query}`, {
    method: 'PUT', headers: { cookie, origin, 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
}
beforeEach(() => { backend.mockReset();vi.stubEnv('PMS_WEB_PUBLIC_URL', 'http://localhost:3001'); });
it('uses only the Staff session, forwards the version and returns an allowlisted acknowledgement', async () => {
  backend.mockResolvedValue(Response.json({ ...result, secret: 'excluded' }));
  const response = await PUT(request(), context);
  expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('private, no-store');expect(await response.json()).toEqual(result);
  expect(backend).toHaveBeenCalledWith(`/api/v1/properties/${propertyId}/service-requests/housekeeping/${requestId}/status`, expect.objectContaining({ method: 'PUT', headers: { authorization: 'Bearer synthetic-staff', 'content-type': 'application/json' }, body: JSON.stringify(payload) }));
});
it('rejects Guest-only cookies and cross-origin or missing-origin writes before Backend', async () => {
  expect((await PUT(request(payload, 'pms_guest_access=synthetic-guest'), context)).status).toBe(401);
  expect((await PUT(request(payload, undefined, 'https://attacker.test'), context)).status).toBe(403);
  expect((await PUT(request(payload, undefined, ''), context)).status).toBe(403);expect(backend).not.toHaveBeenCalled();
});
it.each([{ ...payload, propertyId }, { ...payload, targetStatus: 'OPEN' }, { ...payload, expectedUpdatedAt: 'yesterday' }, { targetStatus: 'DONE' }, [], null])('rejects invalid or identity-bearing payloads', async body => {
  expect((await PUT(request(body), context)).status).toBe(400);expect(backend).not.toHaveBeenCalled();
});
it('rejects malformed identifiers or duplicate property scope', async () => {
  expect((await PUT(request(payload, undefined, undefined, `propertyId=${propertyId}&propertyId=${propertyId}`), context)).status).toBe(400);
  expect((await PUT(request(), { params: Promise.resolve({ requestId: 'other' }) })).status).toBe(400);expect(backend).not.toHaveBeenCalled();
});
it.each([400, 401, 403, 404, 409, 500])('safely propagates backend rejection %i', async status => {
  backend.mockResolvedValue(Response.json({ secret: 'excluded' }, { status }));const response = await PUT(request(), context);
  expect(response.status).toBe(status === 500 ? 503 : status);expect(JSON.stringify(await response.json())).not.toContain('excluded');
});
it.each([{ ...result, propertyId: 'foreign' }, { ...result, id: 'foreign' }, { ...result, status: 'DONE' }])('rejects a mismatched acknowledgement', async body => {
  backend.mockResolvedValue(Response.json(body));expect((await PUT(request(), context)).status).toBe(503);
});
