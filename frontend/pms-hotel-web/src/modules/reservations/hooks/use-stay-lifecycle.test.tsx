import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpStatusError } from '@/lib/http';
import { useStayLifecycle } from './use-stay-lifecycle';
import { staffReservationFixture } from '../staff-reservation.fixture';
const mocks = vi.hoisted(() => ({ perform: vi.fn() }));
vi.mock('../service/stay-lifecycle.service', () => ({ performStayLifecycle: mocks.perform }));
const dto = staffReservationFixture();
const scope = { propertyId: dto.propertyId, reservationId: dto.reservationId, stayId: dto.stays[0].stayId };
const expectation = { expectedStatus: 'RESERVED' as const, expectedRoomId: null, expectedUpdatedAt: dto.stays[0].updatedAt };
const receipt = { ...scope, operationId: dto.reservationId, status: 'IN_HOUSE', completedAt: '2026-10-22T18:10:00.123456Z' };
function harness(allowed = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const hook = renderHook(({ permission, session }) => useStayLifecycle(scope, session, permission), {
    initialProps: { permission: allowed, session: 'staff' },
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  });
  return { ...hook, client, invalidate };
}
beforeEach(() => { mocks.perform.mockReset().mockResolvedValue(receipt); });
describe('Staff lifecycle transactions in UI', () => {
  it('prevents double click and invalidates real reads only after a validated receipt', async () => {
    let resolve!: (value: unknown) => void;
    mocks.perform.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    const { result, invalidate, client } = harness();
    let pending!: ReturnType<typeof result.current.confirm>;
    act(() => { pending = result.current.confirm('check-in', expectation); });
    await act(async () => { expect(await result.current.confirm('check-in', expectation)).toBeUndefined(); });
    expect(mocks.perform).toHaveBeenCalledTimes(1); expect(invalidate).not.toHaveBeenCalled();
    await act(async () => { resolve(receipt); expect(await pending).toEqual(receipt); });
    for (const queryKey of [['reservations', scope.propertyId], ['reservations', 'staff-stays', 'staff', scope.propertyId],
      ['staff-room-assignment', 'staff', scope.propertyId], ['staff-room-occupancy', 'staff', scope.propertyId], ['staff-housekeeping', 'staff', scope.propertyId]])
      expect(invalidate).toHaveBeenCalledWith({ queryKey });
    expect(result.current.busy).toBe(false); client.clear();
  });
  it('retries an unknown outcome with the exact original key and snapshot even if the detail changed', async () => {
    mocks.perform.mockRejectedValueOnce(new HttpStatusError(503, 'Unavailable'));
    const { result, client } = harness();
    await act(async () => { await result.current.confirm('check-in', expectation); });
    expect(result.current.uncertain).toBe(true);
    await act(async () => { await result.current.confirm('check-in', { ...expectation, expectedUpdatedAt: '2026-10-22T18:10:00Z' }); });
    const first = mocks.perform.mock.calls[0], second = mocks.perform.mock.calls[1];
    expect(second.slice(0, 4)).toEqual(first.slice(0, 4)); expect(result.current.uncertain).toBe(false);
    client.clear();
  });
  it.each(['OUTSTANDING_BALANCE', 'BALANCE_UNVERIFIABLE', 'ROOM_NOT_INSPECTED', 'STALE_STAY'])('shows controlled %s without inventing success', async code => {
    mocks.perform.mockRejectedValueOnce(new HttpStatusError(409, 'Conflict', { code, detail: 'private' }));
    const { result, client } = harness();
    await act(async () => { expect(await result.current.confirm('check-in', expectation)).toBeUndefined(); });
    expect(result.current.error).toBeTruthy(); expect(result.current.error).not.toContain('private');
    expect(result.current.uncertain).toBe(false); client.clear();
  });
  it('does not send without permission and discards an in-flight response after session change', async () => {
    const { result, rerender, invalidate, client } = harness(false);
    await act(async () => { await result.current.confirm('check-in', expectation); });
    expect(mocks.perform).not.toHaveBeenCalled();
    rerender({ permission: true, session: 'staff' });
    let resolve!: (value: unknown) => void;
    mocks.perform.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    let pending!: ReturnType<typeof result.current.confirm>;
    act(() => { pending = result.current.confirm('check-in', expectation); });
    const signal = mocks.perform.mock.calls[0][4] as AbortSignal;
    rerender({ permission: true, session: 'other-staff' });
    expect(signal.aborted).toBe(true);
    await act(async () => { resolve(receipt); expect(await pending).toBeUndefined(); });
    expect(invalidate).not.toHaveBeenCalled(); client.clear();
  });
  it('treats a mismatched success receipt as uncertain and preserves its operation key', async () => {
    mocks.perform.mockResolvedValueOnce({ ...receipt, stayId: 'wrong' });
    const { result, client } = harness();
    await act(async () => { expect(await result.current.confirm('check-in', expectation)).toBeUndefined(); });
    expect(result.current.uncertain).toBe(true); client.clear();
  });
});
