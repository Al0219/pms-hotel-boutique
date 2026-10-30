import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cancelStaffReservation, readCancellationPreview } from './staff-cancellation.service';
import { cancellationScope as scope } from '@/test/staff-cancellation-fixture';
const transport = vi.fn<typeof fetch>();
beforeEach(() => { transport.mockReset(); vi.stubGlobal('fetch', transport); });
afterEach(() => vi.unstubAllGlobals());
it('uses Staff BFF cookies and preserves a closed body/key through refresh', async () => {
  transport.mockResolvedValueOnce(new Response(null, { status: 401 })).mockResolvedValueOnce(Response.json({ refreshed: true }))
    .mockResolvedValueOnce(Response.json({ operationId: 'receipt' }));
  const body = { expectedFingerprint: 'a'.repeat(64), reason: 'Solicitud', actorId: 'untrusted', penaltyMinor: 1 };
  await cancelStaffReservation(scope, body, 'operation-key');
  const [url, init] = transport.mock.calls[0];
  expect(url).toContain(`/api/staff/reservations/${scope.reservationId}/cancellation?propertyId=${scope.propertyId}`);
  expect(init?.body).toBe(JSON.stringify({ expectedFingerprint: body.expectedFingerprint, reason: body.reason }));
  expect(new Headers(init?.headers).get('idempotency-key')).toBe('operation-key');
  expect(new Headers(init?.headers).has('authorization')).toBe(false);
  expect(transport.mock.calls[2]).toEqual(transport.mock.calls[0]);
});
it('reads the scoped preview and never automatically retries a lost payment response', async () => {
  transport.mockResolvedValueOnce(Response.json({ canCancel: false }));
  await readCancellationPreview(scope);
  expect(transport.mock.calls[0][0]).toContain('/cancellation-preview?propertyId=');
  transport.mockResolvedValueOnce(new Response(null, { status: 503 }));
  await expect(cancelStaffReservation(scope, { expectedFingerprint: 'a'.repeat(64), reason: 'Solicitud' }, 'key-0001')).rejects.toMatchObject({ status: 503 });
  expect(transport).toHaveBeenCalledTimes(2);
});
