import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpStatusError } from '@/lib/http';
import { StaffReservationCancellation } from './staff-reservation-cancellation';
import { cancellationPreviewFixture as preview, cancellationReceiptFixture as receipt, cancellationScope as scope } from '@/test/staff-cancellation-fixture';
const mocks = vi.hoisted(() => ({ read: vi.fn(), cancel: vi.fn() }));
vi.mock('../service/staff-cancellation.service', () => ({ readCancellationPreview: mocks.read, cancelStaffReservation: mocks.cancel }));
beforeEach(() => { mocks.read.mockReset().mockResolvedValue(preview()); mocks.cancel.mockReset().mockResolvedValue(receipt()); });
afterEach(() => cleanup());
function harness() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const view = render(<QueryClientProvider client={client}><StaffReservationCancellation {...scope} sessionId="staff" cancelled={false} /></QueryClientProvider>);
  return { ...view, client, invalidate };
}
async function open() {
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar reserva' }));
  await screen.findByLabelText(/Motivo de cancelación/);
}
describe('real Staff cancellation UI', () => {
  it('requires a preview and reason, keeps typing focused, prevents double submit and refreshes dependent reads', async () => {
    let resolve!: (v: unknown) => void;
    mocks.cancel.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    const { client, invalidate } = harness();
    await open();
    expect(screen.getByText('Saldo a favor del cliente')).toBeInTheDocument();
    expect(screen.getByText(/no realiza un reembolso/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));
    expect(mocks.cancel).not.toHaveBeenCalled();
    const reason = screen.getByLabelText(/Motivo de cancelación/);
    expect(reason).toHaveFocus();
    fireEvent.change(reason, { target: { value: 'Solicitud del huésped' } });
    expect(reason).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));
    expect(screen.getByRole('button', { name: 'Registrando cancelación…' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Registrando cancelación…' }));
    expect(mocks.cancel).toHaveBeenCalledTimes(1);
    expect(mocks.cancel.mock.calls[0].slice(0, 2)).toEqual([expect.objectContaining(scope), { expectedFingerprint: 'a'.repeat(64), reason: 'Solicitud del huésped' }]);
    await act(async () => resolve(receipt()));
    expect(await screen.findByRole('heading', { name: 'Cancelación registrada' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmar cancelación' })).not.toBeInTheDocument();
    for (const queryKey of [['reservations', scope.propertyId], ['reservations', 'staff-stays', 'staff', scope.propertyId],
      ['staff-room-occupancy', 'staff', scope.propertyId], ['staff-folio', 'staff', scope.propertyId, scope.reservationId]])
      expect(invalidate).toHaveBeenCalledWith({ queryKey });
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ver cancelación' })).toHaveFocus());
    client.clear();
  });
  it.each([0, 5000, 40000])('shows debt or credit from the actual preview with %i paid', async paid => {
    mocks.read.mockResolvedValue(preview(paid));
    const { client } = harness(); await open();
    expect(screen.getByText(paid > 10000 ? 'Saldo a favor del cliente' : 'Saldo pendiente')).toBeInTheDocument();
    client.clear();
  });
  it('preserves every cent when displaying the maximum supported integer amount', async () => {
    const p = preview(0);
    p.financial = { ...p.financial!, accommodationMinor: Number.MAX_SAFE_INTEGER, penaltyMinor: 900719925474099,
      balanceAfterMinor: 900719925474099, dueMinor: 900719925474099 };
    mocks.read.mockResolvedValue(p);
    const { client } = harness(); await open();
    expect(screen.getByText(/90,071,992,547,409\.91/)).toBeInTheDocument();
    client.clear();
  });
  it('preserves the original reason, key and snapshot after unknown transport results', async () => {
    mocks.cancel.mockRejectedValueOnce(new HttpStatusError(503, 'Unavailable'));
    const { client } = harness(); await open();
    fireEvent.change(screen.getByLabelText(/Motivo de cancelación/), { target: { value: 'Solicitud del huésped' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));
    const retry = await screen.findByRole('button', { name: 'Comprobar la misma operación' });
    expect(screen.getByLabelText(/Motivo de cancelación/)).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeDisabled();
    fireEvent.click(retry);
    await screen.findByRole('heading', { name: 'Cancelación registrada' });
    expect(mocks.cancel.mock.calls[1].slice(0, 3)).toEqual(mocks.cancel.mock.calls[0].slice(0, 3));
    client.clear();
  });
  it.each([false, true])('recovers a completed receipt on reconnect without another POST (pending=%s)', async pending => {
    if (pending) mocks.cancel.mockImplementationOnce((_scope, _body, _key, signal: AbortSignal) =>
      new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })));
    else mocks.cancel.mockRejectedValueOnce(new HttpStatusError(503, 'Unavailable'));
    const { client, invalidate } = harness(); await open();
    fireEvent.change(screen.getByLabelText(/Motivo de cancelación/), { target: { value: 'Solicitud del huésped' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));
    if (!pending) await screen.findByRole('button', { name: 'Comprobar la misma operación' });
    mocks.read.mockResolvedValueOnce({ ...preview(), canCancel: false, blockingCode: 'ALREADY_CANCELLED', fingerprint: null, financial: null, completed: receipt() });
    await act(async () => { await client.refetchQueries({ queryKey: ['reservations', 'cancellation', 'staff', scope.propertyId, scope.reservationId] }); });
    await screen.findByRole('heading', { name: 'Cancelación registrada' });
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Comprobar la misma operación' })).not.toBeInTheDocument();
    expect(mocks.cancel).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['staff-folio', 'staff', scope.propertyId, scope.reservationId] });
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.getByRole('button', { name: 'Ver cancelación' })).toBeInTheDocument();
    client.clear();
  });
  it('requires an explicit fresh preview after a stale conflict and never silently confirms new amounts', async () => {
    mocks.cancel.mockRejectedValueOnce(new HttpStatusError(409, 'Conflict', { code: 'STALE_PREVIEW' }));
    const { client } = harness(); await open();
    fireEvent.change(screen.getByLabelText(/Motivo de cancelación/), { target: { value: 'Solicitud del huésped' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));
    await screen.findByRole('button', { name: 'Actualizar vista previa' });
    expect(screen.getByRole('button', { name: 'Confirmar cancelación' })).toBeDisabled();
    expect(mocks.read).toHaveBeenCalledTimes(1);
    mocks.read.mockResolvedValueOnce({ ...preview(40000), fingerprint: 'b'.repeat(64) });
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar vista previa' }));
    await waitFor(() => expect(mocks.read).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar cancelación' })).toBeEnabled());
    expect(mocks.cancel).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));
    await screen.findByRole('heading', { name: 'Cancelación registrada' });
    expect(mocks.cancel.mock.calls[1][1].expectedFingerprint).toBe('b'.repeat(64));
    expect(mocks.cancel.mock.calls[1][2]).not.toBe(mocks.cancel.mock.calls[0][2]);
    client.clear();
  });
  it('shows a completed receipt read-only and blocks financially ambiguous reservations', async () => {
    mocks.read.mockResolvedValueOnce({ ...preview(), canCancel: false, blockingCode: 'FINANCIAL_REVIEW_REQUIRED', fingerprint: null, financial: null });
    const { client } = harness();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar reserva' }));
    await screen.findByText(/No se puede identificar con seguridad/);
    expect(screen.getByRole('button', { name: 'Confirmar cancelación' })).toBeDisabled();
    expect(screen.queryByLabelText(/Motivo de cancelación/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    mocks.read.mockResolvedValueOnce({ ...preview(), canCancel: false, blockingCode: 'ALREADY_CANCELLED', fingerprint: null, financial: null, completed: receipt() });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar reserva' }));
    await screen.findByRole('heading', { name: 'Cancelación registrada' });
    expect(screen.queryByRole('button', { name: 'Confirmar cancelación' })).not.toBeInTheDocument();
    expect(mocks.cancel).not.toHaveBeenCalled(); client.clear();
  });
  it('discards an in-flight cancellation when its Staff identity unmounts', async () => {
    let resolve!: (v: unknown) => void;
    mocks.cancel.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    const { client, unmount, invalidate } = harness(); await open();
    fireEvent.change(screen.getByLabelText(/Motivo de cancelación/), { target: { value: 'Solicitud' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));
    const signal = mocks.cancel.mock.calls[0][3] as AbortSignal;
    unmount(); expect(signal.aborted).toBe(true);
    await act(async () => resolve(receipt()));
    expect(invalidate).not.toHaveBeenCalled(); client.clear();
  });
});
