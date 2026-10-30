import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StaffReservationFolioPanel } from './staff-reservation-folio-panel';
import { folioActor, folioId, folioProperty, folioReservation, paymentReceiptFixture, staffFolioFixture } from '../staff-folio.fixture';
const mocks = vi.hoisted(() => ({ list: vi.fn(), detail: vi.fn(), movements: vi.fn(), record: vi.fn() }));
vi.mock('../service/staff-folio.service', () => ({ readStaffFolios: mocks.list, readStaffFolio: mocks.detail, readStaffMovements: mocks.movements, recordStaffPayment: mocks.record }));
vi.mock('@/modules/stay-journey',()=>({StaffStayJourneyPanel:({paymentOpen}:{paymentOpen:boolean})=>paymentOpen?<div role="dialog" aria-label="Tarjeta de prueba">Formulario de tarjeta</div>:null}));
const clients: QueryClient[] = [];
function mount(stayId?: string) { const client = new QueryClient(); clients.push(client); return render(<QueryClientProvider client={client}>
  <StaffReservationFolioPanel actorId={folioActor} sessionId="session" propertyId={folioProperty} reservationId={folioReservation} stayId={stayId} />
</QueryClientProvider>); }
beforeEach(() => {
  sessionStorage.clear(); const dto = staffFolioFixture();
  mocks.list.mockReset().mockResolvedValue({ propertyId: folioProperty, reservationId: folioReservation, items: [dto.folio], nextCursor: null });
  mocks.detail.mockReset().mockResolvedValue(dto);
  mocks.movements.mockReset().mockResolvedValue({ propertyId: folioProperty, folioId, items: [], nextCursor: null });
  mocks.record.mockReset().mockResolvedValue(paymentReceiptFixture());
});
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); sessionStorage.clear(); });
describe('Staff reservation folio', () => {
  it('validates overpayment, offers full amount, requires confirmation and posts a partial payment', async () => {
    mount(); await screen.findByRole('heading', { name: 'Registrar pago recibido' });
    const input = screen.getByRole('textbox', { name: /Monto recibido/ });
    await waitFor(() => expect(input).toBeEnabled());
    fireEvent.change(input, { target: { value: '100.01' } }); fireEvent.click(screen.getByRole('button', { name: 'Revisar pago' }));
    expect(screen.getByText('Debe ingresar un importe entre Q. 0.00 y Q. 100.00.')).toBeInTheDocument(); expect(mocks.record).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Usar saldo total' })); expect(input).toHaveValue('100.00');
    fireEvent.change(input, { target: { value: '25.50' } }); fireEvent.click(screen.getByRole('button', { name: 'Revisar pago' }));
    const dialog = screen.getByRole('dialog'); expect(within(dialog).getByText('Q 25.50')).toBeInTheDocument(); expect(mocks.record).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar pago recibido' }));
    await screen.findByText(/Pago registrado/); expect(mocks.record).toHaveBeenCalledTimes(1);
    expect(mocks.record.mock.calls[0].slice(0, 3)).toEqual([folioProperty, folioId, { amount: { amount: '25.50', currency: 'GTQ' }, description: 'Pago recibido en recepción' }]);
  });
  it('does not treat missing or empty folio as paid', async () => {
    mocks.list.mockResolvedValueOnce({ propertyId: folioProperty, reservationId: folioReservation, items: [], nextCursor: null });
    const first = mount(); await screen.findByText(/Esta reserva no tiene un folio/); expect(mocks.record).not.toHaveBeenCalled(); first.unmount();
    mocks.detail.mockResolvedValue({ ...staffFolioFixture(), movementCount: 0, balance: { amount: '0.00', currency: 'GTQ' } });
    mount(); await screen.findByText('No verificable'); expect(screen.queryByText('Sin saldo pendiente')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revisar pago' })).not.toBeInTheDocument();
  });
  it('shows a zero verified balance without offering another payment', async () => {
    mocks.detail.mockResolvedValue({ ...staffFolioFixture(), movementCount: 2, balance: { amount: '0.00', currency: 'GTQ' } });
    mount(); await screen.findByText('Sin saldo pendiente'); expect(screen.queryByRole('button', { name: 'Revisar pago' })).not.toBeInTheDocument();
  });
});
it('cash has only amount and description fields and never requests card data',async()=>{mount();await screen.findByRole('heading',{name:'Registrar pago recibido'});expect(screen.getByRole('radio',{name:'Efectivo'})).toBeChecked();expect(screen.getByRole('textbox',{name:/Monto recibido/})).toBeInTheDocument();expect(screen.getByRole('textbox',{name:'Descripción del pago'})).toBeInTheDocument();expect(screen.queryByLabelText('Número de tarjeta ficticia')).not.toBeInTheDocument();expect(screen.queryByLabelText('Vencimiento MM/AA')).not.toBeInTheDocument();expect(screen.queryByLabelText('CVV ficticio')).not.toBeInTheDocument();});

it('keeps card and cash entry mutually exclusive inside the existing Folio panel',async()=>{mount('44444444-4444-4444-4444-444444444444');await screen.findByRole('heading',{name:'Registrar pago recibido'});expect(screen.getByRole('radio',{name:'Efectivo'})).toBeChecked();expect(screen.queryByRole('button',{name:'Tarjeta de prueba'})).not.toBeInTheDocument();fireEvent.click(screen.getByRole('radio',{name:'Tarjeta'}));expect(screen.getByRole('dialog',{name:'Tarjeta de prueba'})).toBeInTheDocument();expect(screen.queryByRole('textbox',{name:/Monto recibido/})).not.toBeInTheDocument();expect(screen.queryByRole('textbox',{name:'Descripción del pago'})).not.toBeInTheDocument();expect(screen.getAllByRole('heading',{name:'Folio y pagos'})).toHaveLength(1);expect(mocks.record).not.toHaveBeenCalled();});
it('cash uses the uniform amount message with the refreshed folio balance',async()=>{
 mount();const amount=await screen.findByRole('textbox',{name:/Monto recibido/});await waitFor(()=>expect(amount).toBeEnabled());fireEvent.change(amount,{target:{value:'800'}});fireEvent.click(screen.getByRole('button',{name:'Revisar pago'}));expect(screen.getByText('Debe ingresar un importe entre Q. 0.00 y Q. 100.00.')).toBeInTheDocument();
 mocks.detail.mockResolvedValue({...staffFolioFixture(),balance:{amount:'770.00',currency:'GTQ'}});await clients[0].invalidateQueries({queryKey:['staff-folio']});await waitFor(()=>expect(screen.getByText('Debe ingresar un importe entre Q. 0.00 y Q. 770.00.')).toBeInTheDocument());expect(mocks.record).not.toHaveBeenCalled();
});
