import { NextRequest } from 'next/server';
import { beforeEach, expect, it, vi } from 'vitest';
const backend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/bff/staff-auth', () => ({ backendStaffRequest: backend, staffAccessCookie: 'pms_staff_access' }));
import { GET } from './route';
const propertyId = '22222222-2222-4222-8222-222222222222';
const dto = { id: '33333333-3333-4333-8333-333333333333', propertyId, confirmationCode: 'HKREAL1234', roomCode: null, serviceDate: '2030-01-02', timeSlot: '10:00–11:00', cleaningType: 'FULL_CLEANING', notes: null, status: 'OPEN' };
const request = (params = `propertyId=${propertyId}`, cookie = 'pms_staff_access=synthetic-staff; pms_guest_access=synthetic-guest') => new NextRequest(`http://localhost:3001/api/staff/housekeeping/requests?${params}`, { headers: { cookie } });
beforeEach(() => backend.mockReset());
it('forwards only Staff credentials and allowlisted data with no-store', async () => {
  backend.mockResolvedValue(Response.json([{ ...dto, secret: 'hidden' }]));const result = await GET(request());
  expect(result.status).toBe(200);expect(result.headers.get('cache-control')).toBe('private, no-store');expect(await result.json()).toEqual([dto]);
  expect(backend.mock.calls[0][0]).toBe(`/api/v1/properties/${propertyId}/service-requests/housekeeping`);
  expect(backend.mock.calls[0][1].headers.authorization).toBe('Bearer synthetic-staff');
});
it('rejects Guest-only access, malformed property and duplicate scopes before Backend', async () => {
  expect((await GET(request(undefined, 'pms_guest_access=synthetic-guest'))).status).toBe(401);
  expect((await GET(request('propertyId=arbitrary'))).status).toBe(400);
  expect((await GET(request(`propertyId=${propertyId}&propertyId=${propertyId}`))).status).toBe(400);expect(backend).not.toHaveBeenCalled();
});
it.each([400, 401, 403, 500])('preserves safe errors %i', async status => {
  backend.mockResolvedValue(Response.json({ secret: 'hidden' }, { status }));const result = await GET(request());expect(result.status).toBe(status === 500 ? 503 : status);expect(JSON.stringify(await result.json())).not.toContain('hidden');
});
it('rejects a foreign-property response instead of leaking it', async () => {
  backend.mockResolvedValue(Response.json([{ ...dto, propertyId: 'foreign' }]));expect((await GET(request())).status).toBe(503);
});
