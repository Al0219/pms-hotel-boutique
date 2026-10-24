import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/data/mocks/server';
import { StaffNewReservationReal } from './staff-new-reservation-real';
const propertyId = '11111111-1111-1111-1111-111111111111', roomTypeId = '22222222-2222-2222-2222-222222222222';
const reservationId = '33333333-3333-3333-3333-333333333333';
const clients: QueryClient[] = [];
const quote = { propertyId, arrival: '2035-01-01', departure: '2035-01-03', rooms: 2, nights: 2, currency: 'GTQ',
  options: [{ roomTypeId, roomTypeName: 'Standard', ratePlanId: 'DEMO_STANDARD', availableRooms: 3, nightlyMinor: 65000, totalMinor: 260000 }] };
beforeEach(() => { vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API','false');
  mockServer.use(http.get('*/api/staff/reservations/creation-options', () => HttpResponse.json(quote))); });
afterEach(() => { cleanup(); clients.splice(0).forEach(c => c.clear()); vi.unstubAllEnvs(); });
function setup(canCreate = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); clients.push(client);
  const view = render(<QueryClientProvider client={client}><StaffNewReservationReal propertyId={propertyId} propertyName="Hotel" timezone="America/Guatemala" sessionId="staff-one" canCreate={canCreate} /></QueryClientProvider>);
  return { client, view };
}
function fill() {
  for (const [label,value] of [['Check-in *','2035-01-01'],['Check-out *','2035-01-03'],['Habitaciones *','2'],['Nombre *','Ana'],['Apellidos *','Perez'],['Correo electrónico *','ana@example.test'],['Teléfono *','+502 5555 5555']])
    fireEvent.change(screen.getByLabelText(label),{ target: { value } });
}
async function review() {
  fill();fireEvent.click(screen.getByText('Consultar disponibilidad →'));
  fireEvent.click(await screen.findByRole('radio'));fireEvent.click(screen.getByText('Revisar reserva'));
}
describe('Staff persistent booking journey', () => {
  it('validates names and contact before requesting options, with focus and accessible error', () => {
    setup();fireEvent.click(screen.getByText('Consultar disponibilidad →'));
    expect(screen.getByLabelText('Nombre *')).toHaveFocus();
    expect(screen.getByLabelText('Correo electrónico *')).toHaveAttribute('aria-invalid','true');
    expect(screen.queryByText('Reserva registrada')).not.toBeInTheDocument();
  });
  it('creates through the Staff BFF and links the persisted reservation to assignment', async () => {
    const command = vi.fn(async ({ request }: { request: Request }) => {
      expect(request.headers.get('Idempotency-Key')).toBeTruthy();
      expect(await request.json()).toMatchObject({ rooms: 2, currency: 'GTQ', clientTotalMinor: 260000, guest: { firstName: 'Ana', lastName: 'Perez' } });
      return HttpResponse.json({ propertyId, reservationId, operationId: roomTypeId, completedAt: '2035-01-01T12:00:00Z' },{ status: 201 });
    });
    mockServer.use(http.post('*/api/staff/reservations',command));
    const { client } = setup();client.setQueryData(['reservations','another-property'],{ protected: true });
    await review();fireEvent.click(screen.getByText('Confirmar y crear reserva'));
    expect(await screen.findByText('Reserva registrada')).toBeInTheDocument();
    expect(screen.getByRole('link',{ name: 'Ver reserva y asignar habitación' })).toHaveAttribute('href',`/reservas/${reservationId}`);
    expect(command).toHaveBeenCalledTimes(1);
    expect(client.getQueryState(['reservations','another-property'])?.isInvalidated).toBe(false);
  });
  it('retries the exact original key/body after an uncertain response, even if inventory is then exhausted', async () => {
    const attempts: { key: string|null; body: unknown }[] = [];
    mockServer.use(http.post('*/api/staff/reservations',async ({ request }) => {
      attempts.push({ key: request.headers.get('idempotency-key'),body: await request.json() });
      if (attempts.length === 1) return HttpResponse.error();
      return HttpResponse.json({ propertyId,reservationId,operationId: roomTypeId,completedAt:'2035-01-01T12:00:00Z' },{ status:201 });
    }));
    setup();await review();fireEvent.click(screen.getByText('Confirmar y crear reserva'));
    const retry = await screen.findByText('Reintentar la misma reserva');
    expect(screen.getByText('Cambiar selección')).toBeDisabled();
    mockServer.use(http.get('*/api/staff/reservations/creation-options', () => HttpResponse.json({ ...quote, options: [] })));
    fireEvent.click(retry);expect(await screen.findByText('Reserva registrada')).toBeInTheDocument();
    expect(attempts).toHaveLength(2);expect(attempts[1]).toEqual(attempts[0]);
  });
  it('shows a definite availability conflict without a success and keeps guest data', async () => {
    mockServer.use(http.post('*/api/staff/reservations',()=>HttpResponse.json({ code:'NO_AVAILABILITY' },{ status:409 })));
    setup();await review();fireEvent.click(screen.getByText('Confirmar y crear reserva'));
    await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('La disponibilidad cambió'));
    expect(screen.queryByText('Reserva registrada')).not.toBeInTheDocument();
    expect(screen.getByText('Ana Perez')).toBeInTheDocument();
    expect(screen.getByText('Cambiar selección')).toBeEnabled();
  });
  it('does not expose creation without current permission', () => {
    setup(false);expect(screen.getByRole('alert')).toHaveTextContent('no tiene permiso');
    expect(screen.queryByText('Consultar disponibilidad →')).not.toBeInTheDocument();
  });
});
