import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ hook: vi.fn(), read: vi.fn(), mutation: vi.fn(), transition: vi.fn() }));
vi.mock('../hooks/use-guest-cleaning-requests', () => ({ useGuestCleaningRequests: mocks.hook }));
vi.mock('../service/guest-cleaning-requests.service', () => ({ readGuestCleaningRequests: mocks.read, transitionGuestCleaningRequest: mocks.transition }));
vi.mock('../hooks/use-housekeeping-transition', () => ({ useHousekeepingTransition: mocks.mutation }));
import { GuestCleaningRequests } from './guest-cleaning-requests';
import { mapGuestCleaningRequests, projectGuestCleaningRequests } from '../mappers/guest-cleaning-request.mapper';
const propertyId = '22222222-2222-4222-8222-222222222222';
const dto = { id: '33333333-3333-4333-8333-333333333333', propertyId, confirmationCode: 'HKREAL1234', roomCode: '204', serviceDate: '2030-01-02', timeSlot: '10:00–11:00', cleaningType: 'FULL_CLEANING', notes: 'Ventana abierta', status: 'OPEN', updatedAt: '2030-01-01T08:00:00Z' };
const allStatuses = ['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED'].map((status, i) => ({ ...dto, status,
  id: `33333333-3333-4333-8333-33333333333${i}`, confirmationCode: `HKREAL${i}`, roomCode: i === 3 ? null : '204' }));
const trigger = () => screen.getByRole('button', { name: /^Limpiezas solicitadas:/ });
const dialog = () => screen.getByRole('dialog', { name: 'Solicitudes de limpieza' });
beforeEach(() => {
  mocks.hook.mockReset().mockReturnValue({ data: mapGuestCleaningRequests(allStatuses, propertyId), isPending: false, isError: false, isFetching: false, fetchStatus: 'idle', refetch: vi.fn() });
  mocks.read.mockReset();
  mocks.transition.mockReset();
  mocks.mutation.mockReset().mockReturnValue({ isPending: false, isError: false, error: null, reset: vi.fn(), mutateAsync: vi.fn() });
});
it('maps persisted requests and excludes non-contract properties', () => {
  expect(projectGuestCleaningRequests([{ ...dto, secret: 'excluded' }], propertyId)).toEqual([dto]);
  expect(mapGuestCleaningRequests([dto], propertyId)[0]).toMatchObject({ reference: 'HKREAL1234', roomLabel: '204', serviceLabel: 'Limpieza completa', status: 'OPEN' });
});
it.each([{ ...dto, propertyId: 'foreign' }, { ...dto, status: 'FAKE' }, { ...dto, serviceDate: 'bad' }, { ...dto, notes: 'x'.repeat(501) }])('rejects foreign or malformed records', row => expect(() => mapGuestCleaningRequests([row], propertyId)).toThrow());
it('counts only OPEN/IN_PROGRESS and opens the complete read-only table exclusively in the dialog', async () => {
  const user = userEvent.setup();render(<GuestCleaningRequests propertyId={propertyId} sessionId="staff-one" />);
  expect(mocks.hook).toHaveBeenCalledWith(propertyId, 'staff-one');
  expect(trigger()).toHaveAccessibleName('Limpiezas solicitadas: 2');
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  await user.click(screen.getByText('Limpiezas solicitadas'));
  expect(dialog()).toHaveAttribute('aria-modal', 'true');
  expect(within(dialog()).getByRole('table', { name: 'Solicitudes Guest de limpieza' })).toBeInTheDocument();
  for (const label of ['Solicitado', 'En proceso', 'Completado', 'Cancelado']) expect(within(dialog()).getByText(label)).toBeInTheDocument();
  expect(within(dialog()).getByText('HKREAL3 · Por asignar')).toBeInTheDocument();
  expect(within(dialog()).getAllByText('Limpieza completa')).toHaveLength(4);
  expect(within(dialog()).getAllByText('2030-01-02 · 10:00–11:00')).toHaveLength(4);
  expect(within(dialog()).getAllByText('Ventana abierta')).toHaveLength(4);
  expect(within(dialog()).queryByRole('button', { name: /Completar|Cancelar|Asignar/ })).not.toBeInTheDocument();
  expect(trigger()).toHaveAttribute('aria-expanded', 'true');
});
it('supports Enter/Space, traps focus and restores the KPI focus after Escape or the close button', async () => {
  const user = userEvent.setup();render(<GuestCleaningRequests propertyId={propertyId} sessionId="staff" />);
  trigger().focus();await user.keyboard('{Enter}');
  const close = within(dialog()).getByRole('button', { name: 'Cerrar' });
  const refresh = within(dialog()).getByRole('button', { name: 'Actualizar solicitudes' });
  expect(close).toHaveFocus();
  await user.tab();expect(refresh).toHaveFocus();
  await user.tab({ shift: true });expect(close).toHaveFocus();
  await user.keyboard('{Escape}');expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(trigger()).toHaveFocus();
  await user.keyboard(' ');expect(dialog()).toBeInTheDocument();
  await user.click(within(dialog()).getByRole('button', { name: 'Cerrar' }));
  expect(trigger()).toHaveFocus();expect(screen.queryByRole('table')).not.toBeInTheDocument();
});
it('shows loading without inventing zero and permits closing during a read', async () => {
  mocks.hook.mockReturnValue({ isPending: true, isFetching: true, fetchStatus: 'fetching' });
  const user = userEvent.setup();render(<GuestCleaningRequests propertyId={propertyId} sessionId="staff" />);
  expect(trigger()).toHaveAccessibleName('Limpiezas solicitadas: Cargando');expect(within(trigger()).getByText('—')).toBeInTheDocument();
  await user.click(trigger());expect(within(dialog()).getByRole('status')).toHaveTextContent('Consultando');
  expect(within(dialog()).getByRole('button', { name: 'Actualizar solicitudes' })).toBeDisabled();
  expect(within(dialog()).getByRole('button', { name: 'Cerrar' })).toBeEnabled();
  await user.keyboard('{Escape}');expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('shows an empty table state and a genuine zero for an empty persisted list', async () => {
  mocks.hook.mockReturnValue({ data: [], isPending: false, isError: false });
  render(<GuestCleaningRequests propertyId={propertyId} sessionId="staff" />);expect(trigger()).toHaveAccessibleName('Limpiezas solicitadas: 0');
  await userEvent.click(trigger());expect(within(dialog()).getByText('Sin solicitudes de limpieza.')).toBeInTheDocument();
});
it('hides stale counts on errors and retries the existing query without a mock fallback', async () => {
  const refetch = vi.fn();mocks.hook.mockReturnValue({ data: mapGuestCleaningRequests([dto], propertyId), isPending: false, isError: true, refetch });
  render(<GuestCleaningRequests propertyId={propertyId} sessionId="staff" />);
  expect(trigger()).toHaveAccessibleName('Limpiezas solicitadas: No disponible');
  await userEvent.click(trigger());expect(within(dialog()).getByRole('alert')).toHaveTextContent('No pudimos');
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  await userEvent.click(within(dialog()).getByRole('button', { name: 'Actualizar solicitudes' }));expect(refetch).toHaveBeenCalledOnce();
});
it('shows offline instead of an indefinitely loading list when the query is paused', async () => {
  mocks.hook.mockReturnValue({ isPending: true, fetchStatus: 'paused' });render(<GuestCleaningRequests propertyId={propertyId} sessionId="staff" />);
  await userEvent.click(trigger());expect(within(dialog()).getByRole('status')).toHaveTextContent('Sin conexión');
});
it('shares one actual query between KPI and modal and refreshes both with one explicit read', async () => {
  const actual = await vi.importActual<typeof import('../hooks/use-guest-cleaning-requests')>('../hooks/use-guest-cleaning-requests');
  mocks.hook.mockImplementation(actual.useGuestCleaningRequests);mocks.read.mockResolvedValue(allStatuses);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const view = render(<QueryClientProvider client={client}><GuestCleaningRequests propertyId={propertyId} sessionId="staff" /></QueryClientProvider>);
  const user = userEvent.setup();await waitFor(() => expect(trigger()).toHaveAccessibleName('Limpiezas solicitadas: 2'));
  await user.click(trigger());await user.keyboard('{Escape}');await user.click(trigger());
  expect(mocks.read).toHaveBeenCalledOnce();
  mocks.read.mockResolvedValue(allStatuses.map(row => ({ ...row, status: 'DONE' })));
  await user.click(within(dialog()).getByRole('button', { name: 'Actualizar solicitudes' }));
  await waitFor(() => expect(trigger()).toHaveAccessibleName('Limpiezas solicitadas: 0'));
  expect(mocks.read).toHaveBeenCalledTimes(2);expect(within(dialog()).getAllByText('Completado')).toHaveLength(4);
  view.unmount();client.clear();
});
it('closes the modal and clears the displayed previous property/account when the authorized context changes', async () => {
  const actual = await vi.importActual<typeof import('../hooks/use-guest-cleaning-requests')>('../hooks/use-guest-cleaning-requests');
  mocks.hook.mockImplementation(actual.useGuestCleaningRequests);mocks.read.mockResolvedValueOnce([dto]).mockResolvedValue([]);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const tree = (property: string, session: string) => <QueryClientProvider client={client}><GuestCleaningRequests key={`${session}:${property}`} propertyId={property} sessionId={session} /></QueryClientProvider>;
  const view = render(tree(propertyId, 'staff-one'));await waitFor(() => expect(trigger()).toHaveAccessibleName('Limpiezas solicitadas: 1'));
  await userEvent.click(trigger());expect(within(dialog()).getByText('HKREAL1234 · 204')).toBeInTheDocument();
  const other = '44444444-4444-4444-8444-444444444444';view.rerender(tree(other, 'staff-two'));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await waitFor(() => expect(trigger()).toHaveAccessibleName('Limpiezas solicitadas: 0'));
  await userEvent.click(trigger());expect(screen.queryByText('HKREAL1234 · 204')).not.toBeInTheDocument();
  expect(mocks.read.mock.calls[1][0]).toBe(other);expect(mocks.read).toHaveBeenCalledTimes(2);
  view.unmount();client.clear();
});

it('keeps intake-only readers read-only even for OPEN and IN_PROGRESS rows', async () => {
  render(<GuestCleaningRequests propertyId={propertyId} sessionId="intake-only" canManage={false} />);
  await userEvent.click(trigger());
  expect(screen.queryByRole('button', { name: 'Iniciar limpieza' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Marcar como completada' })).not.toBeInTheDocument();
});
it('confirms real Staff transitions and refreshes the shared table and pending counter', async () => {
  const read = await vi.importActual<typeof import('../hooks/use-guest-cleaning-requests')>('../hooks/use-guest-cleaning-requests');
  const write = await vi.importActual<typeof import('../hooks/use-housekeeping-transition')>('../hooks/use-housekeeping-transition');
  mocks.hook.mockImplementation(read.useGuestCleaningRequests);
  mocks.mutation.mockImplementation(write.useHousekeepingTransition);
  let row = { ...dto };
  mocks.read.mockImplementation(async () => [row]);
  mocks.transition.mockImplementation(async (property, id, version, target) => {
    expect(property).toBe(propertyId);expect(id).toBe(dto.id);expect(version).toBe(row.updatedAt);
    row = { ...row, status: target, updatedAt: target === 'IN_PROGRESS' ? '2030-01-01T09:00:00Z' : '2030-01-01T09:01:00Z' };
    return { id, propertyId: property, status: target, updatedAt: row.updatedAt, secret: 'not forwarded' };
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } } });
  const view = render(<QueryClientProvider client={client}><GuestCleaningRequests propertyId={propertyId} sessionId="manager" canManage /></QueryClientProvider>);
  await waitFor(() => expect(trigger()).toHaveAccessibleName('Limpiezas solicitadas: 1'));
  await userEvent.click(trigger());await userEvent.click(within(dialog()).getByRole('button', { name: 'Iniciar limpieza' }));
  expect(mocks.transition).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Iniciar limpieza' }));
  await waitFor(() => expect(within(dialog()).getByText('En proceso')).toBeInTheDocument());
  expect(trigger()).toHaveAccessibleName('Limpiezas solicitadas: 1');
  await userEvent.click(within(dialog()).getByRole('button', { name: 'Marcar como completada' }));
  await userEvent.click(screen.getByRole('button', { name: 'Marcar como completada' }));
  await waitFor(() => expect(trigger()).toHaveAccessibleName('Limpiezas solicitadas: 0'));
  expect(within(dialog()).getByText('Completado')).toBeInTheDocument();
  expect(within(dialog()).queryByRole('button', { name: 'Marcar como completada' })).not.toBeInTheDocument();
  expect(mocks.transition).toHaveBeenCalledTimes(2);expect(mocks.read).toHaveBeenCalledTimes(3);
  view.unmount();client.clear();
});
it('preserves the row on an offline transition and offers retry without optimistic success', async () => {
  const mutateAsync = vi.fn().mockRejectedValue(new Error('offline'));
  mocks.mutation.mockReturnValue({ isPending: false, isError: true, error: new Error('offline'), reset: vi.fn(), mutateAsync });
  render(<GuestCleaningRequests propertyId={propertyId} sessionId="manager" canManage />);
  await userEvent.click(trigger());await userEvent.click(screen.getByRole('button', { name: 'Iniciar limpieza' }));
  expect(screen.getByRole('alert')).toHaveTextContent('No pudimos confirmar el resultado');
  await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(mutateAsync).toHaveBeenCalledWith({ id: allStatuses[0].id, expectedUpdatedAt: dto.updatedAt, targetStatus: 'IN_PROGRESS' });
  expect(screen.queryByText('Estado de la solicitud actualizado.')).not.toBeInTheDocument();
  expect(trigger()).toHaveAccessibleName('Limpiezas solicitadas: 2');
});
it('requires a refresh after a concurrent change instead of replaying an obsolete transition', async () => {
  const { HttpStatusError } = await import('@/lib/http/errors');
  const refetch = vi.fn();mocks.hook.mockReturnValue({ data: mapGuestCleaningRequests([dto], propertyId), isPending: false, refetch });
  const mutateAsync = vi.fn();
  mocks.mutation.mockReturnValue({ isPending: false, isError: true, error: new HttpStatusError(409, 'Conflict'), reset: vi.fn(), mutateAsync });
  render(<GuestCleaningRequests propertyId={propertyId} sessionId="manager" canManage />);
  await userEvent.click(trigger());await userEvent.click(screen.getByRole('button', { name: 'Iniciar limpieza' }));
  expect(screen.getByRole('alert')).toHaveTextContent('La solicitud cambió');
  expect(screen.getByRole('button', { name: 'Reintentar' })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Actualizar solicitudes' }));
  expect(refetch).toHaveBeenCalledOnce();expect(mutateAsync).not.toHaveBeenCalled();expect(dialog()).toBeInTheDocument();
});

it.each(['09:00–10:00','10:00–11:00','11:00–12:00','12:00–13:00','14:00–15:00'])('preserves actual service slot %s in Staff table models', timeSlot => {
 expect(mapGuestCleaningRequests([{ ...dto, timeSlot }],propertyId)[0]).toMatchObject({ timeSlot, status: 'OPEN' });
});
