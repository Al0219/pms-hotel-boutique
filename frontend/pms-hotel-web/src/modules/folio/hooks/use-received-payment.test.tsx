import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpStatusError } from '@/lib/http';
import { useReceivedPayment } from './use-received-payment';
import { folioActor, folioId, folioProperty, folioReservation, paymentReceiptFixture, receivedPaymentFixture } from '../staff-folio.fixture';
const mocks = vi.hoisted(() => ({ record: vi.fn() }));
vi.mock('../service/staff-folio.service', () => ({ recordStaffPayment: mocks.record }));
const clients: QueryClient[] = [];
function mount(actor = folioActor) {
  const client = new QueryClient(); clients.push(client); const invalidate = vi.spyOn(client, 'invalidateQueries');
  return { ...renderHook(() => useReceivedPayment(actor, 'session', folioProperty, folioReservation, folioId), {
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  }), invalidate };
}
beforeEach(() => { sessionStorage.clear(); mocks.record.mockReset().mockResolvedValue(paymentReceiptFixture()); });
afterEach(() => { cleanup(); clients.splice(0).forEach(c => c.clear()); sessionStorage.clear(); });
describe('received payment operation recovery', () => {
  it('persists the original payload before sending, prevents double click and refreshes after receipt', async () => {
    let resolve!: (value: unknown) => void;
    mocks.record.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    const { result, invalidate } = mount(); await waitFor(() => expect(result.current.ready).toBe(true));
    let pending!: ReturnType<typeof result.current.submit>;
    act(() => { pending = result.current.submit(receivedPaymentFixture); });
    expect(sessionStorage.length).toBe(1);
    expect(JSON.parse(sessionStorage.getItem(sessionStorage.key(0)!)!).payment).toEqual(receivedPaymentFixture);
    await act(async () => { await result.current.submit(receivedPaymentFixture); });
    expect(mocks.record).toHaveBeenCalledTimes(1); expect(invalidate).not.toHaveBeenCalled();
    await act(async () => { resolve(paymentReceiptFixture()); await pending; });
    expect(result.current.pending).toBeNull(); expect(sessionStorage.length).toBe(0);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['staff-folio', 'session', folioProperty, folioReservation] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['reservations', folioProperty] });
  });
  it('recovers after unmount/reload with the exact key and original amount', async () => {
    mocks.record.mockRejectedValueOnce(new HttpStatusError(503, 'Unavailable'));
    const first = mount(); await waitFor(() => expect(first.result.current.ready).toBe(true));
    await act(async () => { await first.result.current.submit(receivedPaymentFixture); });
    const original = mocks.record.mock.calls[0]; expect(first.result.current.pending).not.toBeNull(); first.unmount();
    const second = mount(); await waitFor(() => expect(second.result.current.ready).toBe(true));
    expect(second.result.current.pending?.payment).toEqual(receivedPaymentFixture);
    await act(async () => { await second.result.current.submit({ ...receivedPaymentFixture, amount: { amount: '99.00', currency: 'GTQ' } }); });
    expect(mocks.record.mock.calls[1].slice(0, 4)).toEqual(original.slice(0, 4));
    expect(second.result.current.notice).toContain('Pago registrado');
  });
  it('keeps an uncertain or denied replay instead of generating a new payment key', async () => {
    mocks.record.mockRejectedValue(new HttpStatusError(403, 'Denied'));
    const { result } = mount(); await waitFor(() => expect(result.current.ready).toBe(true));
    await act(async () => { await result.current.submit(receivedPaymentFixture); });
    const key = mocks.record.mock.calls[0][3];
    await act(async () => { await result.current.submit(); });
    expect(mocks.record.mock.calls[1][3]).toBe(key); expect(result.current.pending).not.toBeNull();
  });
  it('rejects mismatched receipt and never presents an optimistic success', async () => {
    mocks.record.mockResolvedValue(paymentReceiptFixture('99.00'));
    const { result, invalidate } = mount(); await waitFor(() => expect(result.current.ready).toBe(true));
    await act(async () => { await result.current.submit(receivedPaymentFixture); });
    expect(result.current.pending).not.toBeNull(); expect(result.current.notice).toBe(''); expect(invalidate).not.toHaveBeenCalled();
  });
  it('handles a definite changed balance and discards pending storage for another actor', async () => {
    mocks.record.mockRejectedValueOnce(new HttpStatusError(409, 'Conflict', { code: 'PAYMENT_EXCEEDS_BALANCE' }));
    const first = mount(); await waitFor(() => expect(first.result.current.ready).toBe(true));
    await act(async () => { await first.result.current.submit(receivedPaymentFixture); });
    expect(first.result.current.pending).toBeNull(); expect(first.result.current.error).toContain('saldo actual');
    mocks.record.mockRejectedValueOnce(new Error('offline'));
    await act(async () => { await first.result.current.submit(receivedPaymentFixture); });
    expect(sessionStorage.length).toBe(1); first.unmount();
    const other = mount(folioReservation); await waitFor(() => expect(other.result.current.ready).toBe(true));
    expect(other.result.current.pending).toBeNull(); expect(sessionStorage.length).toBe(0);
  });
  it('aborts and ignores a late successful response after leaving the context', async () => {
    let resolve!: (value: unknown) => void;
    mocks.record.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    const hook = mount(); await waitFor(() => expect(hook.result.current.ready).toBe(true));
    let pending!: ReturnType<typeof hook.result.current.submit>;
    act(() => { pending = hook.result.current.submit(receivedPaymentFixture); });
    const signal = mocks.record.mock.calls[0][4] as AbortSignal; hook.unmount(); expect(signal.aborted).toBe(true);
    await act(async () => { resolve(paymentReceiptFixture()); await pending; });
    expect(hook.invalidate).not.toHaveBeenCalled(); expect(sessionStorage.length).toBe(1);
  });
});
