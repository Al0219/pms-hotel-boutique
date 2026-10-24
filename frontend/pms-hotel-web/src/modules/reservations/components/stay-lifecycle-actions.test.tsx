import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpStatusError } from '@/lib/http';
import { mapStaffReservationDetail } from '../mappers/staff-reservation.mapper';
import { staffReservationFixture } from '../staff-reservation.fixture';
import { StayLifecycleActions } from './stay-lifecycle-actions';
const mocks = vi.hoisted(() => ({ perform: vi.fn() }));
vi.mock('../service/stay-lifecycle.service', () => ({ performStayLifecycle: mocks.perform }));
const dto = staffReservationFixture();
const stay = { ...mapStaffReservationDetail(dto).stays[0], roomId: dto.reservationId, roomLabel: '204' };
function view(overrides: Partial<Parameters<typeof StayLifecycleActions>[0]> = {}) {
  const client = new QueryClient();
  return render(<QueryClientProvider client={client}><StayLifecycleActions propertyId={dto.propertyId}
    reservationId={dto.reservationId} sessionId="staff" stay={stay} reservationConfirmed {...overrides} /></QueryClientProvider>);
}
beforeEach(() => mocks.perform.mockReset().mockResolvedValue({ propertyId: dto.propertyId, reservationId: dto.reservationId,
  stayId: stay.id, operationId: dto.reservationId, status: 'IN_HOUSE', completedAt: '2026-10-22T18:10:00Z' }));
describe('Staff entry/exit confirmation', () => {
  it('requires confirmation and shows success only after the receipt', async () => {
    view(); fireEvent.click(screen.getByRole('button', { name: 'Registrar entrada' }));
    expect(screen.getByRole('dialog', { name: 'Confirmar entrada' })).toBeInTheDocument();
    expect(mocks.perform).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar entrada' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('status')).toHaveTextContent('Entrada registrada');
    expect(screen.getByRole('status')).toHaveFocus();
    expect(mocks.perform.mock.calls[0][2].expectedUpdatedAt).toBe(dto.stays[0].updatedAt);
  });
  it('blocks entry before room assignment and omits new entry for an unconfirmed parent', () => {
    const first = view({ stay: { ...stay, roomId: null, roomLabel: null } });
    expect(screen.getByRole('button', { name: 'Registrar entrada' })).toBeDisabled(); first.unmount();
    view({ reservationConfirmed: false }); expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it('freezes the room and version shown at confirmation even if a background read changes', async () => {
    const client = new QueryClient();
    const props = { propertyId: dto.propertyId, reservationId: dto.reservationId, sessionId: 'staff', stay, reservationConfirmed: true };
    const rendered = render(<StayLifecycleActions {...props} />, { wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar entrada' }));
    rendered.rerender(<StayLifecycleActions {...props} stay={{ ...stay, roomId: dto.propertyId, roomLabel: '205', updatedAt: '2026-10-22T19:00:00.654321Z' }} />);
    expect(screen.getByRole('dialog')).toHaveTextContent('Habitación 204');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar entrada' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mocks.perform.mock.calls[0][2]).toMatchObject({ expectedRoomId: stay.roomId, expectedUpdatedAt: stay.updatedAt });
  });
  it('shows checkout consequences and keeps a financial block visible without success', async () => {
    mocks.perform.mockRejectedValueOnce(new HttpStatusError(409, 'Conflict', { code: 'OUTSTANDING_BALANCE' }));
    view({ stay: { ...stay, travelState: 'IN_HOUSE' }, reservationConfirmed: false });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar salida' }));
    expect(screen.getByText(/Se conservarán las fechas originales/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar salida' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Hay saldo pendiente');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
  it('retains the recovery option when a dialog is closed after a lost response', async () => {
    mocks.perform.mockRejectedValueOnce(new Error('Network disconnected'));
    view(); fireEvent.click(screen.getByRole('button', { name: 'Registrar entrada' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar entrada' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('sin duplicarla');
    fireEvent.click(screen.getByRole('button', { name: 'Volver al detalle' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar operación pendiente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar misma operación' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mocks.perform.mock.calls[1].slice(0, 4)).toEqual(mocks.perform.mock.calls[0].slice(0, 4));
  });
});
