import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpStatusError } from '@/lib/http';
import { useStayJourney } from './use-stay-journey';
import { context, receipt, summary } from '@/test/stay-journey-fixture';
const mocks = vi.hoisted(() => ({ read: vi.fn(), pay: vi.fn(), reconcile: vi.fn() }));
vi.mock('../service/stay-journey.service', () => ({ readJourney: mocks.read, simulateJourneyPayment: mocks.pay, reconcileJourney: mocks.reconcile,documentFile:vi.fn() }));
const clients: QueryClient[] = [];
function mount(actor = 'actor') { const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 }, mutations: { gcTime: 0 } } }); clients.push(client); return renderHook(() => useStayJourney(context, actor, 'session', true), { wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> }); }
beforeEach(() => { sessionStorage.clear(); mocks.read.mockImplementation((_c, action) => Promise.resolve(action === 'requests' ? [] : summary())); mocks.pay.mockReset().mockResolvedValue(receipt()); mocks.reconcile.mockResolvedValue(summary()); });
afterEach(() => { cleanup(); clients.splice(0).forEach(c => c.clear()); sessionStorage.clear(); });
const input = { amount: '30.00', currency: 'GTQ' as const, instrumentToken: 'demo_visa_approved' };
describe('simulated folio payment recovery', () => {
  it('recovers a lost response after remount using exactly the original key and payload', async () => {
    mocks.pay.mockRejectedValueOnce(new TypeError('network lost'));
    const first = mount(); await waitFor(() => expect(first.result.current.ready && first.result.current.summary.isSuccess).toBe(true));
    await act(async () => { await first.result.current.pay(input); });
    expect(first.result.current.pending?.input).toEqual(input); const key = mocks.pay.mock.calls[0][2];
    expect(JSON.stringify(sessionStorage)).not.toMatch(/holder|cvv|pan|424242/); first.unmount();
    const second = mount(); await waitFor(() => expect(second.result.current.pending?.key).toBe(key)); await waitFor(() => expect(second.result.current.summary.isSuccess).toBe(true));
    await act(async () => { await second.result.current.pay(); });
    expect(mocks.pay.mock.calls[1].slice(0, 3)).toEqual([context, input, key]); expect(second.result.current.pending).toBeNull(); expect(second.result.current.notice).toMatch(/aprobado/);
  });
  it('blocks double submission and retains recovery on close/unmount without inventing success', async () => {
    let resolve!: (v: unknown) => void; mocks.pay.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    const view = mount(); await waitFor(() => expect(view.result.current.ready && view.result.current.summary.isSuccess).toBe(true));
    let pending!: Promise<unknown>; act(() => { pending = view.result.current.pay(input); });
    await act(async () => { await view.result.current.pay(input); }); expect(mocks.pay).toHaveBeenCalledTimes(1);
    view.unmount(); await act(async () => { resolve(receipt()); await pending; }); expect(sessionStorage.length).toBe(1);
  });
  it.each(['DECLINED', 'ERROR'] as const)('a confirmed %s has no payment and releases the attempt', async result => {
    mocks.pay.mockResolvedValueOnce({ ...receipt(), result, movementId: null }); const view = mount(); await waitFor(() => expect(view.result.current.ready && view.result.current.summary.isSuccess).toBe(true));
    await act(async () => { await view.result.current.pay(input); }); expect(view.result.current.pending).toBeNull(); expect(view.result.current.notice).toMatch(/No se registró/);
  });
  it('does not restore another actor operation', async () => {
    mocks.pay.mockRejectedValueOnce(new TypeError('lost')); const first = mount(); await waitFor(() => expect(first.result.current.ready && first.result.current.summary.isSuccess).toBe(true)); await act(async () => { await first.result.current.pay(input); }); first.unmount();
    const other = mount('other'); await waitFor(() => expect(other.result.current.ready).toBe(true)); expect(other.result.current.pending).toBeNull(); expect(sessionStorage.length).toBe(0);
  });
});

it('preserves the exact unknown operation when authorization is temporarily denied', async () => {
  mocks.pay.mockRejectedValueOnce(new HttpStatusError(403, 'Denied'));
  const view = mount(); await waitFor(() => expect(view.result.current.ready && view.result.current.summary.isSuccess).toBe(true));
  await act(async () => { await view.result.current.pay(input); });
  expect(view.result.current.pending?.input).toEqual(input); expect(sessionStorage.length).toBe(1);
});

it('allowlists pending storage fields even if a caller supplies extra card metadata', async () => {
  mocks.pay.mockRejectedValueOnce(new TypeError('lost'));
  const view = mount(); await waitFor(() => expect(view.result.current.ready && view.result.current.summary.isSuccess).toBe(true));
  const untrusted = { ...input, pan: 'forbidden', cvv: 'forbidden', holderName: 'not-to-store' };
  await act(async () => { await view.result.current.pay(untrusted); });
  expect(view.result.current.pending?.input).toEqual(input);
  const stored = sessionStorage.getItem(sessionStorage.key(0)!)!;
  expect(stored).not.toMatch(/pan|cvv|holderName|forbidden/);
});
