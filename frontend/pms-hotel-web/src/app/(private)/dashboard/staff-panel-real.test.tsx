import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/data/mocks/server';
import { inventoryPropertyId, staffInventoryFixture, staffReservationFixture } from '@/test/staff-inventory-fixture';
import Dashboard from './page';

const mocks = vi.hoisted(() => ({ scope: vi.fn(), session: vi.fn() }));
vi.mock('@/modules/properties', () => ({ usePropertyScope: mocks.scope }));
vi.mock('@/modules/auth', () => ({ useStaffSession: mocks.session }));
const other = '88888888-8888-8888-8888-888888888888';
let reads: string[];
const clients: QueryClient[] = [];
function choose(id: string) { mocks.scope.mockReturnValue({ ready: true, scope: { kind: 'PROPERTY', propertyIds: [id] } }); }
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); clients.push(client);
  const view = render(<QueryClientProvider client={client}><Dashboard /></QueryClientProvider>);
  return { client, ...view, refresh: () => view.rerender(<QueryClientProvider client={client}><Dashboard /></QueryClientProvider>) };
}
function counts() { return Array.from(screen.getByLabelText('Resumen de la propiedad').querySelectorAll('dd')).map(el => el.textContent); }
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false'); reads = []; choose(inventoryPropertyId);
  mocks.session.mockReturnValue({ id: 'staff-1', memberships: [{ propertyId: inventoryPropertyId, name: 'Hotel real', active: true }, { propertyId: other, name: 'Otro hotel', active: true }] });
  const inventory = staffInventoryFixture(), reservation = staffReservationFixture();
  reservation.stays.push({ ...reservation.stays[0], stayId: '66666666-6666-6666-6666-666666666666' });
  mockServer.use(
    http.get('*/api/staff/reservations', ({ request }) => { reads.push(request.url); return HttpResponse.json(new URL(request.url).searchParams.get('propertyId') === other ? [] : [reservation, { ...reservation, reservationId: '99999999-9999-9999-9999-999999999999', stays: [] }]); }),
    http.get('*/api/staff/rooms', ({ request }) => { reads.push(request.url); return HttpResponse.json(new URL(request.url).searchParams.get('propertyId') === other ? [] : inventory.rooms); }),
    http.get('*/api/staff/room-types', ({ request }) => { reads.push(request.url); return HttpResponse.json(new URL(request.url).searchParams.get('propertyId') === other ? [] : inventory.types); }),
  );
});
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.unstubAllEnvs(); });
describe('Staff Panel real data', () => {
  it('summarizes operational parent states without confusing stays or inventory with availability', async () => {
    const first = staffReservationFixture();
    first.stays.push({ ...first.stays[0], stayId: '66666666-6666-6666-6666-666666666666', status: 'CHECKED_OUT' });
    first.stays[0].status = 'IN_HOUSE';
    const cancelled = { ...staffReservationFixture(), reservationId: '99999999-9999-9999-9999-999999999999', confirmationCode: 'CANCELLED-BOOKING', status: 'CANCELLED' };
    mockServer.use(http.get('*/api/staff/reservations', () => HttpResponse.json([first, cancelled])));
    mount(); await screen.findByLabelText('Resumen de la propiedad');
    expect(counts()).toEqual(['2', '3', '2']);
    const states = screen.getByRole('region', { name: 'Estado de las reservas' });
    expect(within(states).getByText('En estancia')).toBeInTheDocument();
    expect(within(states).getByText('Cancelada')).toBeInTheDocument();
    expect(within(states).getAllByText('de 2')).toHaveLength(2);
    const inventory = screen.getByRole('region', { name: 'Habitaciones por tipo' });
    expect(within(inventory).getByText('Deluxe real')).toBeInTheDocument();
    expect(within(inventory).getByText(/El inventario físico no indica disponibilidad/)).toBeInTheDocument();
    expect(screen.queryByText(/RevPAR|ADR|Ingresos|Ocupación/)).not.toBeInTheDocument();
  });
  it('shows only the latest five records in API order with actionable reservation links', async () => {
    const list = Array.from({ length: 6 }, (_, index) => ({ ...staffReservationFixture(),
      reservationId: `${String(index + 1).repeat(8)}-aaaa-aaaa-aaaa-aaaaaaaaaaaa`, confirmationCode: `BOOKING-${index + 1}` }));
    list[0].responsibleGuest = null;
    list[0].stays = [];
    mockServer.use(http.get('*/api/staff/reservations', () => HttpResponse.json(list)));
    mount(); await screen.findByLabelText('Resumen de la propiedad');
    const recent = screen.getByRole('table');
    expect(within(recent).getAllByRole('row')).toHaveLength(6);
    expect(within(recent).queryByText('BOOKING-6')).not.toBeInTheDocument();
    expect(within(recent).getByText('Huésped sin registrar')).toBeInTheDocument();
    expect(within(recent).getByText('Duración sin registrar')).toBeInTheDocument();
    expect(within(recent).getByRole('link', { name: 'Abrir reserva BOOKING-1' })).toHaveAttribute('href', `/reservas/${list[0].reservationId}`);
    expect(within(recent).getAllByRole('row')[1]).toHaveTextContent('BOOKING-1');
  });
  it('refreshes both sources explicitly and hides all previous sections while waiting', async () => {
    mount(); await screen.findByLabelText('Resumen de la propiedad');
    let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
    mockServer.use(http.get('*/api/staff/reservations', async () => { await gate; return HttpResponse.json([]); }));
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar datos' }));
    await waitFor(() => expect(screen.queryByRole('table')).not.toBeInTheDocument());
    expect(screen.queryByLabelText('Resumen de la propiedad')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actualizando…' })).toBeDisabled();
    await act(async () => release());
    await screen.findByText('No hay reservas registradas en esta propiedad.');
    expect(counts()).toEqual(['0', '0', '2']);
    expect(reads.filter(url => new URL(url).pathname.endsWith('/rooms'))).toHaveLength(2);
  });
  it.each(['false', 'true'])('uses real reads with mocks=%s and counts parents independently of N stays', async flag => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', flag); mount(); await screen.findByLabelText('Resumen de la propiedad');
    expect(counts()).toEqual(['2', '2', String(staffInventoryFixture().rooms.length)]);
    expect(reads).toHaveLength(3); expect(reads.every(url => new URL(url).searchParams.get('propertyId') === inventoryPropertyId)).toBe(true);
    expect(screen.getByRole('link', { name: /Ver reservas/ })).toHaveAttribute('href', '/reservas');
    expect(screen.getByRole('link', { name: /Ver habitaciones/ })).toHaveAttribute('href', '/staff/habitaciones');
    expect(screen.getByRole('link', { name: /Abrir calendario/ })).toHaveAttribute('href', '/calendario');
    expect(screen.queryByText(/RevPAR|ADR|Ingresos|Ocupación/)).not.toBeInTheDocument();
  });
  it.each([null, { kind: 'ALL_PROPERTIES', propertyIds: [inventoryPropertyId, other] }])('does not query for nonspecific scope %s', scope => {
    mocks.scope.mockReturnValue({ ready: true, scope }); mount();
    expect(screen.getByRole('heading', { name: 'Selecciona una propiedad' })).toBeInTheDocument(); expect(reads).toEqual([]);
  });
  it('waits for PropertyContext readiness', () => {
    mocks.scope.mockReturnValue({ ready: false, scope: null }); mount(); expect(screen.getByRole('status')).toHaveTextContent('Preparando'); expect(reads).toEqual([]);
  });
  it('hides old values during switching and when revisiting a cached property', async () => {
    const view = mount(); await screen.findByLabelText('Resumen de la propiedad'); choose(other); view.refresh();
    expect(screen.queryByLabelText('Resumen de la propiedad')).not.toBeInTheDocument();
    await screen.findByText('No hay reservas registradas en esta propiedad.'); expect(counts()).toEqual(['0', '0', '0']);
    choose(inventoryPropertyId); view.refresh(); expect(screen.queryByLabelText('Resumen de la propiedad')).not.toBeInTheDocument();
    await screen.findByLabelText('Resumen de la propiedad'); expect(counts()[0]).toBe('2');
    expect(reads.filter(url => new URL(url).searchParams.get('propertyId') === inventoryPropertyId)).toHaveLength(6);
  });
  it('isolates Staff sessions and hides cached counts during background refresh', async () => {
    const view = mount(); await screen.findByLabelText('Resumen de la propiedad');
    mocks.session.mockReturnValue({ ...mocks.session(), id: 'staff-2' }); view.refresh();
    expect(screen.queryByLabelText('Resumen de la propiedad')).not.toBeInTheDocument(); await screen.findByLabelText('Resumen de la propiedad'); expect(reads).toHaveLength(6);
    let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
    mockServer.use(http.get('*/api/staff/reservations', async () => { await gate; return HttpResponse.json([]); }));
    let refresh!: Promise<void>;
    act(() => { refresh = view.client.invalidateQueries({ queryKey: ['reservations'] }); });
    await waitFor(() => expect(screen.queryByLabelText('Resumen de la propiedad')).not.toBeInTheDocument());
    await act(async () => { release(); await refresh; }); await screen.findByLabelText('Resumen de la propiedad'); expect(counts()[0]).toBe('0');
  });
  it.each(['reservations', 'rooms', 'room-types'])('fails closed on %s failure and recovers through retry', async resource => {
    mockServer.use(http.get(`*/api/staff/${resource}`, () => new HttpResponse(null, { status: 503 })));
    mount(); await screen.findByRole('alert'); expect(screen.queryByLabelText('Resumen de la propiedad')).not.toBeInTheDocument();
    const inventory = staffInventoryFixture(); mockServer.use(http.get(`*/api/staff/${resource}`, () => HttpResponse.json(resource === 'reservations' ? [] : resource === 'rooms' ? inventory.rooms : inventory.types)));
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' })); await screen.findByLabelText('Resumen de la propiedad');
  });
  it('rejects responses from another property', async () => {
    mockServer.use(http.get('*/api/staff/reservations', () => HttpResponse.json([{ ...staffReservationFixture(), propertyId: other }])));
    mount(); await screen.findByRole('alert'); expect(screen.queryByLabelText('Resumen de la propiedad')).not.toBeInTheDocument();
  });
});
