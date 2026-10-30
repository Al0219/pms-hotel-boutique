import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpStatusError } from '@/lib/http';
import { mapStaffReservationDetail } from '../mappers/staff-reservation.mapper';
import { staffReservationFixture } from '../staff-reservation.fixture';
import { StayLifecycleActions } from './stay-lifecycle-actions';
const mocks = vi.hoisted(() => ({ perform: vi.fn(), requests: [] as {id:string;kind:string;status:string}[], summary: {balance:'0.00',verifiable:true,pendingOrders:0,unpostedOrders:0} }));
vi.mock('../service/stay-lifecycle.service', () => ({ performStayLifecycle: mocks.perform }));
vi.mock('@/modules/stay-journey',()=>({useJourneyRead:()=>({requests:{data:mocks.requests,isError:false},summary:{isSuccess:true,data:mocks.summary}})}));
const dto = staffReservationFixture();
const stay = { ...mapStaffReservationDetail(dto).stays[0], roomId: dto.reservationId, roomLabel: '204' };
function view(overrides: Partial<Parameters<typeof StayLifecycleActions>[0]> = {}) {
  const client = new QueryClient();
  return render(<QueryClientProvider client={client}><StayLifecycleActions propertyId={dto.propertyId}
    reservationId={dto.reservationId} sessionId="staff" stay={stay} reservationConfirmed financial {...overrides} /></QueryClientProvider>);
}
beforeEach(() => { mocks.requests=[];mocks.summary={balance:'0.00',verifiable:true,pendingOrders:0,unpostedOrders:0};mocks.perform.mockReset().mockResolvedValue({ propertyId: dto.propertyId, reservationId: dto.reservationId,
  stayId: stay.id, operationId: dto.reservationId, status: 'IN_HOUSE', completedAt: '2026-10-22T18:10:00Z' }); });
describe('Staff entry/exit confirmation', () => {
  it('requires confirmation and shows success only after the receipt', async () => {
    view(); fireEvent.click(screen.getByRole('button', { name: 'Registrar entrada' }));
    expect(screen.getByRole('dialog', { name: 'Confirmar entrada' })).toBeInTheDocument();
    expect(mocks.perform).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar entrada' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('status')).toHaveTextContent('Entrada registrada');
    await waitFor(() => expect(screen.getByRole('status')).toHaveFocus());
    expect(mocks.perform.mock.calls[0][2].expectedUpdatedAt).toBe(dto.stays[0].updatedAt);
  });
  it.each([
    { action: 'entrada', previous: 'RESERVED', status: 'IN_HOUSE' },
    { action: 'salida', previous: 'IN_HOUSE', status: 'CHECKED_OUT' },
  ] as const)('keeps the $action receipt focused without restoring the old command', async ({ action, previous, status }) => {
    mocks.perform.mockResolvedValueOnce({ propertyId: dto.propertyId, reservationId: dto.reservationId,
      stayId: stay.id, operationId: dto.reservationId, status, completedAt: '2026-10-22T18:10:00Z' });
    view({ stay: { ...stay, travelState: previous } });
    const trigger = screen.getByRole('button', { name: `Registrar ${action}` });
    trigger.focus();
    const restoreFocus = vi.spyOn(trigger, 'focus');
    try {
      fireEvent.click(trigger);
      fireEvent.click(screen.getByRole('button', { name: `Confirmar ${action}` }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      await waitFor(() => expect(screen.getByRole('status')).toHaveFocus());
      expect(restoreFocus).not.toHaveBeenCalled();
    } finally { restoreFocus.mockRestore(); }
  });
  it('returns focus to the command when confirmation is cancelled without a receipt', async () => {
    view();
    const trigger = screen.getByRole('button', { name: 'Registrar entrada' });
    trigger.focus(); fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Volver al detalle' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(mocks.perform).not.toHaveBeenCalled();
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
    expect(screen.queryByText(/Se conservarán las fechas originales/)).not.toBeInTheDocument();
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

it.each([{balance:'12.00',verifiable:true,pendingOrders:0,unpostedOrders:0},{balance:'0.00',verifiable:false,pendingOrders:0,unpostedOrders:0},{balance:'0.00',verifiable:true,pendingOrders:1,unpostedOrders:0},{balance:'0.00',verifiable:true,pendingOrders:0,unpostedOrders:1}])('blocks exit for financial readiness: %j',summary=>{mocks.summary=summary;view({stay:{...stay,travelState:'IN_HOUSE'}});expect(screen.getByRole('button',{name:'Registrar salida'})).toBeDisabled();});
it('shows Guest request within the existing action and contextual confirmation, without blocking entry on debt',()=>{mocks.requests=[{id:stay.id,kind:'CHECK_IN',status:'OPEN'}];mocks.summary={balance:'650.00',verifiable:true,pendingOrders:0,unpostedOrders:0};view();expect(screen.getByText('Entrada solicitada por el huésped')).toBeInTheDocument();const button=screen.getByRole('button',{name:'Registrar entrada'});expect(button).toBeEnabled();fireEvent.click(button);expect(screen.queryByText(/también resolverá la solicitud pendiente/)).not.toBeInTheDocument();});

it('contextually confirms the Guest checkout request through the existing exit operation',async()=>{mocks.requests=[{id:stay.id,kind:'CHECK_OUT',status:'OPEN'}];view({stay:{...stay,travelState:'IN_HOUSE'}});expect(screen.getByText('Salida solicitada por el huésped')).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Registrar salida'}));expect(screen.queryByText(/también resolverá la solicitud pendiente/)).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Confirmar salida'}));await waitFor(()=>expect(mocks.perform).toHaveBeenCalledTimes(1));expect(mocks.perform.mock.calls[0][1]).toBe('check-out');});
