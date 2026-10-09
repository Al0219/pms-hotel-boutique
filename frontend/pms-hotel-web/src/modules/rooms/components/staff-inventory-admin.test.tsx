import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { delay, http, HttpResponse } from 'msw';
import { mockServer } from '@/data/mocks/server';
import { inventoryPropertyId, staffInventoryFixture } from '@/test/staff-inventory-fixture';
import { RoomCatalogAdmin } from './room-catalog-admin';
const clients: QueryClient[] = [];
let catalog: ReturnType<typeof staffInventoryFixture>, writes: Array<{ method: string; body: Record<string, string>; propertyId: string | null }>, failure: number, slow: boolean;
const newTypeId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', newRoomId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false'); catalog = staffInventoryFixture(); writes = []; failure = 0; slow = false;
  mockServer.use(
    http.get('*/api/staff/rooms', () => HttpResponse.json(catalog.rooms)),
    http.get('*/api/staff/room-types', () => HttpResponse.json(catalog.types)),
    http.post('*/api/auth/staff/refresh', () => new HttpResponse(null, { status: 401 })),
    ...(['rooms', 'room-types'] as const).flatMap(resource => {
      const write = async ({ request, params }: { request: Request; params: Record<string, string | readonly string[] | undefined> }) => {
        const body = await request.json() as Record<string, string>;
        writes.push({ method: request.method, body, propertyId: new URL(request.url).searchParams.get('propertyId') });
        if (slow) await delay(150);
        if (failure) return HttpResponse.json({ error: 'unavailable' }, { status: failure });
        const collection = resource === 'rooms' ? catalog.rooms : catalog.types;
        if (request.method === 'PATCH') {
          const entry = collection.find(item => item.id === params.id)!;
          Object.assign(entry, body, { updatedAt: '2026-10-08T12:00:00Z' });
          return HttpResponse.json(entry);
        }
        const entry = { propertyId: inventoryPropertyId, id: resource === 'rooms' ? newRoomId : newTypeId, createdAt: '2026-10-08T12:00:00Z', updatedAt: '2026-10-08T12:00:00Z', ...body };
        if (resource === 'rooms') catalog.rooms.push(entry as typeof catalog.rooms[number]); else catalog.types.push(entry as typeof catalog.types[number]);
        return HttpResponse.json(entry, { status: 201 });
      };
      return [http.post(`*/api/staff/${resource}`, write), http.patch(`*/api/staff/${resource}/:id`, write)];
    }),
  );
});
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.unstubAllEnvs(); });
function mount(canManage = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } }); clients.push(client);
  return render(<QueryClientProvider client={client}><RoomCatalogAdmin propertyId={inventoryPropertyId} sessionId="staff-real" canManage={canManage} /></QueryClientProvider>);
}
async function tab(name: string) { fireEvent.click(await screen.findByRole('tab', { name })); }
async function edit(label: string, value: string) {
  fireEvent.click(screen.getByRole('button', { name: `Editar ${label}` }));
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  await waitFor(() => expect(screen.queryByLabelText(label)).not.toBeInTheDocument());
}
it('creates and edits both entities inline, refreshes from the read API and survives a fresh client mount', async () => {
  mount(); await tab('Tipos de habitación');
  fireEvent.click(screen.getByRole('button', { name: 'Nuevo tipo' }));
  fireEvent.change(screen.getByLabelText('Código del tipo'), { target: { value: 'FAM' } });
  fireEvent.change(screen.getByLabelText('Nombre del tipo'), { target: { value: 'Familiar' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  await screen.findByRole('button', { name: 'Editar código del tipo FAM' });
  expect(catalog.rooms).toHaveLength(2); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await edit('código del tipo FAM', 'FAM-2'); await edit('nombre del tipo Familiar', 'Familiar nueva');
  await tab('Habitaciones físicas'); fireEvent.click(screen.getByRole('button', { name: 'Nueva habitación' }));
  fireEvent.change(screen.getByLabelText('Código de habitación'), { target: { value: '301' } });
  fireEvent.change(screen.getByLabelText('Tipo de habitación'), { target: { value: newTypeId } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  await screen.findByRole('button', { name: 'Editar código de habitación 301' });
  await edit('código de habitación 301', '302');
  expect(catalog.rooms.find(room => room.id === newRoomId)).toMatchObject({ code: '302', roomTypeId: newTypeId });
  expect(writes.map(write => write.body)).toEqual([{ code: 'FAM', name: 'Familiar' }, { code: 'FAM-2' }, { name: 'Familiar nueva' }, { code: '301', roomTypeId: newTypeId }, { code: '302' }]);
  expect(writes.every(write => write.propertyId === inventoryPropertyId)).toBe(true);
  cleanup(); mount(); await screen.findByRole('button', { name: 'Editar código de habitación 302' });
  expect(within(screen.getByRole('table')).getByText('Familiar nueva')).toBeInTheDocument();
  await tab('Tipos de habitación'); expect(screen.getByRole('button', { name: 'Editar código del tipo FAM-2' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Eliminar/ })).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/Piso|Notas|fotografías/i)).not.toBeInTheDocument();
});
it.each([400, 401, 403, 404, 409, 503])('preserves prior saved value and draft after failed PATCH %i, without claiming success', async status => {
  failure = status; mount();
  fireEvent.click(await screen.findByRole('button', { name: 'Editar código de habitación 101' }));
  fireEvent.change(screen.getByLabelText('código de habitación 101'), { target: { value: '106' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  await screen.findByRole('alert');
  expect(screen.getByLabelText('código de habitación 101')).toHaveValue('106');
  expect(screen.getByText('Valor actual: 101')).toBeInTheDocument();
  expect(catalog.rooms[0].code).toBe('101'); expect(screen.queryByText('Guardado.')).not.toBeInTheDocument(); expect(writes).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(screen.getByRole('button', { name: 'Editar código de habitación 101' })).toBeInTheDocument();
});
it('blocks double submit while creating and retains the draft on a rejected creation', async () => {
  failure = 409; slow = true; mount(); await tab('Tipos de habitación');
  fireEvent.click(screen.getByRole('button', { name: 'Nuevo tipo' }));
  fireEvent.change(screen.getByLabelText('Código del tipo'), { target: { value: 'DUP' } });
  fireEvent.change(screen.getByLabelText('Nombre del tipo'), { target: { value: 'Mi tipo' } });
  const form = screen.getByRole('form', { name: 'Crear tipo de habitación' });
  fireEvent.submit(form); fireEvent.submit(form);
  expect(screen.getByRole('button', { name: 'Guardando…' })).toBeDisabled(); expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  await screen.findByRole('alert'); expect(writes).toHaveLength(1);
  expect(screen.getByLabelText('Nombre del tipo')).toHaveValue('Mi tipo'); expect(catalog.types).toHaveLength(1);
});
it('supports cancel without writing and does not manufacture a type for a room', async () => {
  catalog = { rooms: [], types: [] }; mount(); await screen.findByRole('tab', { name: 'Habitaciones físicas' });
  fireEvent.click(screen.getByRole('button', { name: 'Nueva habitación' })); expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  expect(screen.getByText(/Crea primero un tipo/)).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Cancelar' })); expect(writes).toHaveLength(0);
});
it('does not expose real mutation controls without the permission supplied by Staff composition', async () => {
  mount(false); await screen.findByRole('tab', { name: 'Habitaciones físicas' });
  expect(screen.queryByRole('button', { name: 'Nueva habitación' })).not.toBeInTheDocument(); expect(screen.queryByRole('button', { name: /Editar/ })).not.toBeInTheDocument();
  await tab('Tipos de habitación'); expect(screen.queryByRole('button', { name: 'Nuevo tipo' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Editar/ })).not.toBeInTheDocument(); expect(writes).toHaveLength(0);
});
it('does not apply a delayed old-property mutation to the new scoped catalog', async () => {
  const otherId = '99999999-9999-9999-9999-999999999999';
  const other = staffInventoryFixture();
  other.types = other.types.map(type => ({ ...type, propertyId: otherId, id: 'cccccccc-cccc-cccc-cccc-cccccccccccc' }));
  other.rooms = [{ ...other.rooms[0], propertyId: otherId, id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', roomTypeId: other.types[0].id, code: '201' }];
  let release!: () => void;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  mockServer.use(
    http.get('*/api/staff/rooms', ({ request }) => HttpResponse.json(new URL(request.url).searchParams.get('propertyId') === otherId ? other.rooms : catalog.rooms)),
    http.get('*/api/staff/room-types', ({ request }) => HttpResponse.json(new URL(request.url).searchParams.get('propertyId') === otherId ? other.types : catalog.types)),
    http.patch('*/api/staff/rooms/:id', async () => { await blocked; return HttpResponse.json({ ...catalog.rooms[0], code: '109' }); }),
  );
  const view = mount(), client = clients[clients.length - 1];
  fireEvent.click(await screen.findByRole('button', { name: 'Editar código de habitación 101' }));
  fireEvent.change(screen.getByLabelText('código de habitación 101'), { target: { value: '109' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  view.rerender(<QueryClientProvider client={client}><RoomCatalogAdmin key={otherId} propertyId={otherId} sessionId="staff-real" canManage /></QueryClientProvider>);
  await screen.findByRole('button', { name: 'Editar código de habitación 201' }); release();
  await waitFor(() => expect(client.isMutating()).toBe(0));
  expect(screen.getByRole('button', { name: 'Editar código de habitación 201' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Editar código de habitación 109' })).not.toBeInTheDocument();
});
