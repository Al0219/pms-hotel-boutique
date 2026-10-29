import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { performStayLifecycle } from './stay-lifecycle.service';
const transport = vi.fn<typeof fetch>();
const scope = { propertyId: 'property', reservationId: 'reservation', stayId: 'stay' };
const expectation = { expectedStatus: 'RESERVED', expectedRoomId: 'room', expectedUpdatedAt: '2026-10-22T18:00:00.123456Z' } as const;
beforeEach(() => { transport.mockReset(); vi.stubGlobal('fetch', transport); });
afterEach(() => vi.unstubAllGlobals());
describe('lifecycle service', () => {
  it('passes the exact expectation and idempotency key through a Staff refresh', async () => {
    transport.mockResolvedValueOnce(new Response(null, { status: 401 })).mockResolvedValueOnce(Response.json({ refreshed: true }))
      .mockResolvedValueOnce(Response.json({ operationId: 'receipt' }));
    const controller = new AbortController();
    expect(await performStayLifecycle(scope, 'check-in', expectation, 'same-operation', controller.signal)).toEqual({ operationId: 'receipt' });
    expect(transport.mock.calls[0][0]).toContain('/api/staff/reservations/reservation/stays/stay/check-in?propertyId=property');
    expect(transport.mock.calls[0][1]).toMatchObject({ method: 'POST', body: JSON.stringify(expectation), signal: controller.signal });
    expect(new Headers(transport.mock.calls[0][1]?.headers).get('idempotency-key')).toBe('same-operation');
    expect(new Headers(transport.mock.calls[0][1]?.headers).has('authorization')).toBe(false);
    expect(transport.mock.calls[1][0]).toContain('/api/auth/staff/refresh');
    expect(transport.mock.calls[2]).toEqual(transport.mock.calls[0]);
  });
  it.each([403, 409, 503])('does not automatically retry status %i', async status => {
    transport.mockResolvedValue(Response.json({ code: 'OUTSTANDING_BALANCE' }, { status }));
    await expect(performStayLifecycle(scope, 'check-out', { ...expectation, expectedStatus: 'IN_HOUSE' }, 'same-operation')).rejects.toMatchObject({ status });
    expect(transport).toHaveBeenCalledTimes(1);
  });
});
