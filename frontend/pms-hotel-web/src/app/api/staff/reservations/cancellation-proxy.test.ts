import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './[reservationId]/cancellation-preview/route';
import { POST } from './[reservationId]/cancellation/route';
import { cancellationPreviewFixture as preview, cancellationReceiptFixture as receipt, cancellationScope as scope } from '@/test/staff-cancellation-fixture';
const mocks = vi.hoisted(() => ({ backend: vi.fn() }));
vi.mock('@/lib/bff/staff-auth', () => ({ staffAccessCookie: 'pms_staff_access', backendStaffRequest: mocks.backend }));
const context = { params: Promise.resolve({ reservationId: scope.reservationId }) };
const body = { expectedFingerprint: 'a'.repeat(64), reason: 'Solicitud del huésped' };
function request(options: { get?: boolean; body?: unknown; raw?: string; cookie?: string; origin?: string; key?: string; query?: string } = {}) {
  return new NextRequest(`http://localhost:3001/api/staff/reservations/${scope.reservationId}/cancellation?${options.query ?? `propertyId=${scope.propertyId}`}`, {
    method: options.get ? 'GET' : 'POST', headers: { cookie: options.cookie ?? 'pms_staff_access=staff; pms_guest_access=guest',
      origin: options.origin ?? 'http://localhost:3001', 'content-type': 'application/json', 'idempotency-key': options.key ?? 'operation-key', authorization: 'Bearer untrusted' },
    ...(options.get ? {} : { body: options.raw ?? JSON.stringify(options.body ?? body) }),
  });
}
beforeEach(() => { mocks.backend.mockReset(); vi.stubEnv('PMS_WEB_PUBLIC_URL', 'http://localhost:3001'); });
afterEach(() => vi.unstubAllEnvs());
describe('Staff cancellation BFF', () => {
  it('projects both real contracts, using only Staff cookies and fixed scoped paths', async () => {
    mocks.backend.mockResolvedValueOnce(Response.json({ ...preview(), secret: 'hidden' }));
    const read = await GET(request({ get: true }), context);
    expect(read.status).toBe(200); expect(await read.json()).toEqual(preview());
    mocks.backend.mockResolvedValueOnce(Response.json({ ...receipt(), secret: 'hidden' }));
    const response = await POST(request(), context);
    expect(response.status).toBe(200); expect(await response.json()).toEqual(receipt());
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(mocks.backend.mock.calls[1]).toEqual([`/api/v1/reservations/${scope.reservationId}/cancellation?propertyId=${scope.propertyId}`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify(body), headers: { authorization: 'Bearer staff', 'content-type': 'application/json', 'idempotency-key': 'operation-key' } })]);
  });
  it('rejects guest-only, foreign origin, injected amounts, oversized/malformed body and ambiguous scope before transport', async () => {
    for (const [options, expected] of [
      [{ cookie: 'pms_guest_access=guest' }, 401], [{ origin: 'http://evil.test' }, 403],
      [{ body: { ...body, penaltyMinor: 0 } }, 400], [{ body: { ...body, reason: '' } }, 400],
      [{ body: { ...body, reason: 'a'.repeat(256) } }, 400], [{ body: { ...body, reason: 'bad\0reason' } }, 400],
      [{ key: 'short' }, 400], [{ raw: 'x'.repeat(4097) }, 400], [{ raw: '{bad' }, 400],
      [{ query: `propertyId=${scope.propertyId}&propertyId=${scope.propertyId}` }, 400], [{ query: 'propertyId=ALL_PROPERTIES' }, 400],
    ] as const) expect((await POST(request(options), context)).status).toBe(expected);
    expect(mocks.backend).not.toHaveBeenCalled();
  });
  it('preserves only confirmed conflict codes and sanitizes upstream failures', async () => {
    for (const status of [400, 401, 403, 404, 409, 500]) {
      mocks.backend.mockResolvedValueOnce(Response.json({ code: 'STALE_PREVIEW', detail: 'secret' }, { status }));
      const response = await POST(request(), context);
      expect(response.status).toBe(status === 500 ? 503 : status);
      expect(await response.json()).toEqual({ error: 'Cancellation unavailable', ...(status === 409 ? { code: 'STALE_PREVIEW' } : {}) });
    }
  });
  it('treats foreign or corrupt success and lost transport as unknown rather than success', async () => {
    for (const r of [{ ...receipt(), reservationId: scope.propertyId }, { ...receipt(), financial: { ...receipt().financial, creditMinor: 999 } },
      { ...receipt(), policyCode: 'invented' }]) {
      mocks.backend.mockResolvedValueOnce(Response.json(r));
      expect((await POST(request(), context)).status).toBe(503);
    }
    mocks.backend.mockRejectedValueOnce(new Error('transport-secret'));
    const response = await POST(request(), context);
    expect(response.status).toBe(503); expect(await response.text()).not.toContain('secret');
  });
  it('preserves a completed immutable cancellation for later consultation', async () => {
    const value = { ...preview(), canCancel: false, blockingCode: 'ALREADY_CANCELLED', fingerprint: null, financial: null, completed: receipt() };
    mocks.backend.mockResolvedValueOnce(Response.json(value));
    expect(await (await GET(request({ get: true }), context)).json()).toEqual(value);
  });
});
