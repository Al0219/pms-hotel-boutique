import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/data/mocks/server';
import { inventoryPropertyId, staffInventoryFixture, staffReservationFixture } from '@/test/staff-inventory-fixture';
import { StaffRoomsWorkspace } from './staff-property-workspace';

const mocks = vi.hoisted(() => ({ scope: vi.fn(), session: vi.fn() }));
vi.mock('@/modules/properties', () => ({ usePropertyScope: mocks.scope }));
vi.mock('@/modules/auth', () => ({ useStaffSession: mocks.session }));
let reads: string[];
let failReservations: boolean;
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false'); reads = []; failReservations = false;
  mocks.scope.mockReturnValue({ ready: true, scope: { kind: 'PROPERTY', propertyIds: [inventoryPropertyId] } });
  mocks.session.mockReturnValue({ id: 'real-staff', roleId: 'SUPER_ADMIN', permissions: ['RESERVATION_MANAGE', 'COMMERCIAL_MANAGE'],
    memberships: [{ propertyId: inventoryPropertyId, name: 'Hotel real', timezone: 'America/Guatemala', active: true }] });
  const inventory = staffInventoryFixture(), reservation = staffReservationFixture();
  reservation.stays.push({ ...reservation.stays[0], stayId: '66666666-6666-6666-6666-666666666666',
    room: { roomId: inventory.rooms[0].id, code: 'unrelated-display-code' } });
  mockServer.use(
    http.get('*/api/staff/rooms', ({ request }) => { reads.push(request.url); return HttpResponse.json(inventory.rooms); }),
    http.get('*/api/staff/room-types', ({ request }) => { reads.push(request.url); return HttpResponse.json(inventory.types); }),
    http.get('*/api/staff/reservations', ({ request }) => { reads.push(request.url); return failReservations
      ? HttpResponse.json({ error: 'unavailable' }, { status: 503 }) : HttpResponse.json([reservation]); }),
  );
});
afterEach(() => vi.unstubAllEnvs());
function renderWorkspace() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(<QueryClientProvider client={client}><StaffRoomsWorkspace /></QueryClientProvider>);
  return { ...view, client };
}
describe('Staff Rooms real composition', () => {
  it('joins by roomId, shows unassigned stays and follows dates without operation or mutation claims', async () => {
    renderWorkspace();
    await screen.findByRole('row', { name: /Habitación 101/ });
    fireEvent.change(screen.getByLabelText('Fecha de consulta'), { target: { value: '2026-11-01' } });
    await screen.findByLabelText('Estadías sin habitación asignada');
    expect(screen.getByText(/Sin asignar · 1 estadía/)).toBeInTheDocument();
    expect(screen.getAllByText('Reservada').length).toBeGreaterThan(0);
    expect(within(screen.getByRole('table', { name: 'Habitaciones del hotel' })).getByRole('link', { name: /Abrir reserva/ })).toHaveAttribute('href', `/reservas/${staffReservationFixture().reservationId}`);
    expect(screen.queryByLabelText('Estado operativo')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Piso')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Poner fuera|Liberar a activa|Asignar habitación/ })).not.toBeInTheDocument();
    expect(screen.getAllByText('Estado operativo no disponible').length).toBeGreaterThan(0);
    const table = screen.getByRole('table', { name: 'Habitaciones del hotel' });
    expect(within(table).getAllByRole('columnheader').map(th => th.textContent)).toEqual(['Identidad', 'Contexto', 'Relación', 'Estado']);
    expect(within(table).getByText('REAL-BOOKING')).toBeInTheDocument();
    expect(within(table).getByText('2026-11-01')).toBeInTheDocument();
    expect(within(table).getByText('2026-11-03')).toBeInTheDocument();
    expect(within(table).getByText('Sin estadía asignada')).toBeInTheDocument();
    expect(screen.getByLabelText('Estadías sin habitación asignada')).not.toHaveAttribute('open');
    expect(screen.queryByRole('heading', { name: 'Estado de habitación' })).not.toBeInTheDocument();
    fireEvent.doubleClick(within(table).getByText('Habitación 101'));
    fireEvent.pointerUp(within(table).getByRole('row', { name: /Habitación 101/ }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(reads.every(url => !url.includes('__mock'))).toBe(true);
    expect(reads.every(url => new URL(url).searchParams.get('propertyId') === inventoryPropertyId)).toBe(true);
    fireEvent.change(screen.getByLabelText('Fecha de consulta'), { target: { value: '2026-11-03' } });
    expect(screen.queryByLabelText('Estadías sin habitación asignada')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2 Libre de estadías' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Fecha de consulta'), { target: { value: '' } });
    expect(screen.getByText('Elige una fecha válida para consultar las estadías.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '— Libre de estadías' })).toBeDisabled();
  });
  it('clears occupancy on failed refresh and recovers while preserving real physical inventory', async () => {
    renderWorkspace(); await screen.findByRole('row', { name: /Habitación 101/ });
    fireEvent.change(screen.getByLabelText('Fecha de consulta'), { target: { value: '2026-11-01' } });
    await screen.findByLabelText('Estadías sin habitación asignada');
    failReservations = true; fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    await screen.findByText(/No pudimos consultar la ocupación/);
    expect(screen.queryByLabelText('Estadías sin habitación asignada')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '— Libre de estadías' })).toBeDisabled();
    expect(screen.getByRole('row', { name: /Habitación 101/ })).toBeInTheDocument();
    failReservations = false; fireEvent.click(screen.getByRole('button', { name: 'Reintentar ocupación' }));
    await screen.findByLabelText('Estadías sin habitación asignada');
  });
  it('reads the real catalog in the existing second view and offers only contracted inventory management', async () => {
    renderWorkspace(); fireEvent.click(screen.getByRole('button', { name: 'Administrar inventario' }));
    await screen.findByRole('heading', { name: 'Administrar habitaciones' });
    expect(screen.getByRole('button', { name: 'Nueva habitación' })).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getAllByRole('button', { name: /Editar código/ })).toHaveLength(2);
    fireEvent.click(screen.getByRole('tab', { name: 'Tipos de habitación' }));
    expect(within(screen.getByRole('table')).getByText('Deluxe real')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nuevo tipo' })).toBeInTheDocument();
  });
  it('rejects cross-property responses after a context change and never retains the former room', async () => {
    const view = renderWorkspace(); await screen.findByRole('row', { name: /Habitación 101/ });
    const other = '99999999-9999-9999-9999-999999999999';
    mocks.scope.mockReturnValue({ ready: true, scope: { kind: 'PROPERTY', propertyIds: [other] } });
    view.rerender(<QueryClientProvider client={view.client}><StaffRoomsWorkspace /></QueryClientProvider>);
    expect(screen.queryByRole('row', { name: /Habitación 101/ })).not.toBeInTheDocument();
    await screen.findByText('No se pudo cargar el tablero de habitaciones.');
    expect(screen.queryByRole('row', { name: /Habitación 101/ })).not.toBeInTheDocument();
    await waitFor(() => expect(reads.some(url => new URL(url).searchParams.get('propertyId') === other)).toBe(true));
  });
});
it('refreshes real stay references and room context after an acknowledged type rename', async () => {
  const inventory = staffInventoryFixture(), reservation = staffReservationFixture();
  mockServer.use(
    http.get('*/api/staff/rooms', () => HttpResponse.json(inventory.rooms)),
    http.get('*/api/staff/room-types', () => HttpResponse.json(inventory.types)),
    http.get('*/api/staff/reservations', ({ request }) => { reads.push(request.url); return HttpResponse.json([reservation]); }),
    http.patch('*/api/staff/room-types/:id', async ({ request }) => {
      const body = await request.json() as { name: string };
      inventory.types[0].name = body.name; reservation.stays[0].roomType.name = body.name;
      return HttpResponse.json(inventory.types[0]);
    }),
  );
  renderWorkspace(); await screen.findByRole('row', { name: /Habitación 101/ });
  const before = reads.filter(url => url.includes('/reservations?')).length;
  fireEvent.click(screen.getByRole('button', { name: 'Administrar inventario' }));
  fireEvent.click(await screen.findByRole('tab', { name: 'Tipos de habitación' }));
  fireEvent.click(screen.getByRole('button', { name: 'Editar nombre del tipo Deluxe real' }));
  fireEvent.change(screen.getByLabelText('nombre del tipo Deluxe real'), { target: { value: 'Deluxe actualizado' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  await screen.findByRole('button', { name: 'Editar nombre del tipo Deluxe actualizado' });
  expect(reads.filter(url => url.includes('/reservations?')).length).toBeGreaterThan(before);
  fireEvent.click(screen.getByRole('button', { name: 'Tablero operativo' }));
  await screen.findByRole('row', { name: /Habitación 101/ });
  fireEvent.change(screen.getByLabelText('Fecha de consulta'), { target: { value: '2026-11-01' } });
  const unassigned = await screen.findByLabelText('Estadías sin habitación asignada');
  expect(within(unassigned).getByText('Deluxe actualizado')).toBeInTheDocument();
  expect(within(screen.getByRole('row', { name: /Habitación 101/ })).getByText('Deluxe actualizado')).toBeInTheDocument();
});
