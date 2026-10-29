import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/data/mocks/server';
import { StaffAdminWorkspace } from './index';
import { mapStaffAdminContext, mapStaffAdminDetail, mapStaffAdminPage } from './mappers/staff-admin.mapper';
import { DomainMappingError } from '@/lib/errors/domain-mapping-error';
const mocks = vi.hoisted(() => ({ session: vi.fn(), scope: vi.fn(), revalidate: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock('@/modules/auth', () => ({ useStaffSession: mocks.session, useRevalidateStaffSession: () => mocks.revalidate }));
vi.mock('@/modules/properties', () => ({ usePropertyScope: mocks.scope }));
const org = '11111111-1111-4111-8111-111111111111', p1 = '22222222-2222-4222-8222-222222222222', p2 = '33333333-3333-4333-8333-333333333333', id = '44444444-4444-4444-8444-444444444444';
const roleDTO = () => ({ organizationId: org, items: ['SUPER_ADMIN', 'GERENCIA', 'RECEPCION', 'OPERACIONES', 'AUDITOR'].map(code => ({ code, name: code })) });
const userDTO = (username = 'mlopez') => ({ id, username, workEmail: 'mlopez@hotel.example', status: 'SUSPENDED', roleCode: 'GERENCIA', membershipStatus: 'ACTIVE', organizationId: org, propertyIds: [p1, p2], createdAt: '2026-10-22T00:00:00.123456789Z', updatedAt: '2026-10-22T00:00:00Z', version: 1 });
const context = () => ({ organizationId: org, scope: { kind: 'PROPERTY' as const, propertyIds: [p1] as [string] }, authorizedPropertyIds: [p1, p2], role: 'GERENCIA' });
const page = () => ({ organizationId: org, scope: context().scope, items: [userDTO()], limit: 50, nextCursor: null });
let reads: URL[];
const clients: QueryClient[] = [];
function choose(propertyId = p1) { mocks.scope.mockReturnValue({ ready: true, scope: { kind: 'PROPERTY', propertyIds: [propertyId] } }); }
function mount(props: Parameters<typeof StaffAdminWorkspace>[0] = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clients.push(client);
  const view = render(<QueryClientProvider client={client}><StaffAdminWorkspace {...props} /></QueryClientProvider>);
  return { ...view, client, refresh: (next = props) => view.rerender(<QueryClientProvider client={client}><StaffAdminWorkspace {...next} /></QueryClientProvider>) };
}
beforeEach(() => {
  reads = []; mocks.revalidate.mockReset(); mocks.replace.mockReset(); choose();
  mocks.session.mockReturnValue({ id: 'session-1', staffUserId: id, roleId: 'GERENCIA', permissions: ['STAFF_MANAGE', 'MULTI_PROPERTY_READ'], memberships: [p1, p2].map((propertyId, i) => ({ propertyId, active: true, name: `Hotel ${i + 1}`, timezone: 'America/Guatemala', currency: 'GTQ', propertyCode: null })) });
  mockServer.use(
    http.post('*/api/staff/admin/users/:staffId/invitation', async ({ params, request }) => {
      const body = await request.json() as { expectedVersion: number };
      return HttpResponse.json({ organizationId: org, staffUserId: params.staffId, version: body.expectedVersion + 1, changed: true });
    }),
    http.post('*/api/auth/staff/refresh', () => new HttpResponse(null, { status: 401 })),
    http.get('*/api/staff/admin/roles', () => HttpResponse.json(roleDTO())),
    http.get('*/api/staff/admin/users', ({ request }) => { const url = new URL(request.url); reads.push(url); return HttpResponse.json({ ...page(), scope: { kind: url.searchParams.get('scope'), propertyIds: url.searchParams.get('scope') === 'PROPERTY' ? [url.searchParams.get('propertyId')] : [p1, p2] }, limit: Number(url.searchParams.get('limit')) }); }),
    http.get(`*/api/staff/admin/users/${id}`, () => HttpResponse.json({ organizationId: org, scope: context().scope, item: userDTO() })),
  );
});
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.unstubAllEnvs(); });
describe('Staff administration UI', () => {
  it.each(['true', 'false'])('uses real BFF with mocks=%s, exactly three grouped columns and no fake mutations', async value => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', value); mount(); const row = await screen.findByRole('row', { name: /mlopez/ });
    expect(screen.getAllByRole('columnheader').map(el => el.textContent)).toEqual(['Usuario', 'Acceso', 'Asignación']);
    const cells = within(row).getAllByRole('cell'); expect(cells).toHaveLength(3);
    expect(screen.queryByRole('columnheader', { name: 'Acciones' })).not.toBeInTheDocument();
    expect(within(cells[0]).getByRole('button')).toHaveAttribute('data-staff-expand');
    expect(cells[0]).toHaveTextContent('mlopez@hotel.example'); expect(cells[1]).toHaveTextContent('GERENCIA'); expect(cells[1]).toHaveTextContent('Pendiente de activación'); expect(cells[2]).toHaveTextContent('2 propiedades asignadas');
    expect(within(row).getByRole('button', { name: 'Expandir información de mlopez' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /Editar|Guardar|Dar de baja/ })).not.toBeInTheDocument(); expect(reads[0].searchParams.get('propertyId')).toBe(p1);
  });
  it('debounces literal search and sends filters to Backend, preserving detail navigation', async () => {
    const user = userEvent.setup(); mount(); await screen.findByText('mlopez'); await user.type(screen.getByLabelText('Buscar por username'), 'm%_'); expect(screen.getByText('mlopez')).toBeInTheDocument(); expect(screen.getByText('Actualizando…')).toBeInTheDocument();
    await waitFor(() => expect(reads.at(-1)?.searchParams.get('username')).toBe('m%_'));
    await user.selectOptions(screen.getByLabelText('Rol'), 'GERENCIA'); await user.selectOptions(screen.getByLabelText('Estado'), 'SUSPENDED'); await screen.findByText('mlopez');
    expect(reads.at(-1)?.searchParams.get('roleCode')).toBe('GERENCIA'); expect(reads.at(-1)?.searchParams.get('status')).toBe('SUSPENDED'); expect(screen.getByLabelText('Buscar por username')).toHaveValue('m%_');
  });
  it('uses opaque cursor and backward history; filters, page size and scope reset pagination', async () => {
    mockServer.use(http.get('*/api/staff/admin/users', ({ request }) => {
      const url = new URL(request.url); reads.push(url); const next = url.searchParams.has('cursor'), limit = Number(url.searchParams.get('limit'));
      return HttpResponse.json({ ...page(), limit, items: next ? [userDTO('second')] : Array.from({ length: limit }, (_, i) => ({ ...userDTO(`user${i}`), id: `${String(i).padStart(8, '0')}-4444-4444-8444-444444444444` })), nextCursor: next ? null : 'signed+opaque/==' });
    }));
    // Exercise real cursor transitions with a full, small page; this is not a 50-row render benchmark.
    const view = mount({ initial: { limit: 5 } }), user = userEvent.setup(); await screen.findByText('user0');
    expect(reads[0].searchParams.get('limit')).toBe('5');
    await user.click(screen.getByRole('button', { name: 'Página siguiente' })); await screen.findByText('second'); expect(reads.at(-1)?.searchParams.get('cursor')).toBe('signed+opaque/==');
    await user.click(screen.getByRole('button', { name: 'Página anterior' })); await screen.findByText('user0'); expect(reads.at(-1)?.searchParams.has('cursor')).toBe(false);
    expect(screen.getByRole('button', { name: 'Página 1' })).toHaveAttribute('aria-current', 'page');
    await user.click(screen.getByRole('button', { name: 'Página siguiente' })); await screen.findByText('second'); await user.selectOptions(screen.getByLabelText('Estado'), 'SUSPENDED'); await screen.findByText('user0'); expect(reads.at(-1)?.searchParams.has('cursor')).toBe(false);
    await user.selectOptions(screen.getByLabelText('Filas por página'), '25'); await screen.findByText('user0'); expect(reads.at(-1)?.searchParams.get('limit')).toBe('25'); choose(p2); view.refresh(); expect(screen.queryByText('user0')).not.toBeInTheDocument();
  });
  it('sends the common five-row size to Backend and renders the shared footer', async () => {
    mount(); const user = userEvent.setup(); await screen.findByText('mlopez');
    expect(screen.getByText('1–1 usuarios')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página anterior' })).toHaveTextContent('‹');
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toHaveTextContent('›');
    await user.selectOptions(screen.getByLabelText('Filas por página'), '5');
    await waitFor(() => expect(reads.at(-1)?.searchParams.get('limit')).toBe('5'));
    await screen.findByText('mlopez'); expect(reads.at(-1)?.searchParams.has('cursor')).toBe(false);
  });
  it('expands detail under demand, does not duplicate identity and collapses with keyboard', async () => {
    const getDetail = vi.fn(() => HttpResponse.json({ organizationId: org, scope: context().scope, item: { ...userDTO(), membershipStatus: 'INACTIVE' } }));
    mockServer.use(http.get(`*/api/staff/admin/users/${id}`, getDetail));
    mount({ initial: { username: 'm%', status: 'SUSPENDED' } }); await screen.findByText('mlopez'); expect(getDetail).not.toHaveBeenCalled();
    const user = userEvent.setup(), button = screen.getByRole('button', { name: 'Expandir información de mlopez' }); button.focus(); await user.keyboard('{Enter}');
    await screen.findByText('Inactiva'); expect(getDetail).toHaveBeenCalledTimes(1); expect(button).toHaveAttribute('aria-expanded', 'true');
    const region = screen.getByRole('region', { name: 'Contraer información de mlopez' }); expect(region.id).toBe(button.getAttribute('aria-controls'));
    expect(region.closest('td')).toHaveAttribute('colspan', '3');
    expect(within(region).getByText('Hotel 2')).toBeInTheDocument(); expect(within(region).queryByText('mlopez')).not.toBeInTheDocument(); expect(within(region).queryByText('mlopez@hotel.example')).not.toBeInTheDocument();
    expect(within(region).getByText('Creación')).toBeInTheDocument(); expect(screen.getByLabelText('Buscar por username')).toHaveValue('m%');
    await user.keyboard(' '); expect(button).toHaveAttribute('aria-expanded', 'false'); expect(screen.getByText('Inactiva')).not.toBeVisible();
  });
  it('removes redundant header texts and does not expose credentials in expanded content', async () => {
    mount(); await screen.findByText('mlopez'); expect(screen.getByRole('heading', { name: 'Usuarios' })).toBeInTheDocument();
    for (const text of ['Fechas en hora de Guatemala.', 'Administración · Staff', 'Solo lectura', 'Consulta las cuentas de tu organización y su acceso a las propiedades.']) expect(screen.queryByText(text)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Expandir información de mlopez' })); await screen.findByText('Creación');
    expect(screen.queryByText(/passwordHash|Contraseña|Restablecer acceso/)).not.toBeInTheDocument(); expect(screen.getAllByRole('table')).toHaveLength(1);
  });
  it('toggles from row content and reuses a fresh on-demand detail without a visible details button', async () => {
    const detail = vi.fn(() => HttpResponse.json({ organizationId: org, scope: context().scope, item: userDTO() }));
    mockServer.use(http.get(`*/api/staff/admin/users/${id}`, detail));
    mount(); const row = await screen.findByRole('row', { name: /mlopez/ });
    expect(detail).not.toHaveBeenCalled(); expect(screen.queryByText(/Ver más|Ver menos/)).not.toBeInTheDocument();
    fireEvent.click(within(row).getByText('mlopez@hotel.example')); await screen.findByText('Creación');
    const control = within(row).getByRole('button'); expect(control).toHaveFocus(); expect(control).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByText('Fechas en hora de Guatemala.')).not.toBeInTheDocument();
    fireEvent.click(within(row).getByText('GERENCIA')); expect(control).toHaveAttribute('aria-expanded', 'false'); expect(screen.getByText('Creación')).not.toBeVisible();
    fireEvent.click(row); await screen.findByRole('region', { name: 'Contraer información de mlopez' });
    expect(detail).toHaveBeenCalledTimes(1);
  });
  it.each(['input', 'select', 'button', 'a', 'menu', 'swipe', 'editable'])('does not expand from nested %s controls', async kind => {
    mount(); const row = await screen.findByRole('row', { name: /mlopez/ }), cell = within(row).getAllByRole('cell')[0];
    const element = document.createElement(['menu', 'swipe', 'editable'].includes(kind) ? 'span' : kind);
    if (kind === 'menu') element.setAttribute('role', 'menuitem');
    if (kind === 'swipe') element.setAttribute('data-staff-row-action', '');
    if (kind === 'editable') element.setAttribute('contenteditable', '');
    cell.appendChild(element); fireEvent.click(element);
    expect(row.querySelector('[data-staff-expand]')).toHaveAttribute('aria-expanded', 'false'); expect(screen.queryByText('Creación')).not.toBeInTheDocument();
    element.remove();
  });
  it('keeps the table and input stable across a delayed username request, ignoring older replies', async () => {
    const view = mount(); await screen.findByText('mlopez'); const table = screen.getByRole('table'), input = screen.getByLabelText('Buscar por username');
    let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
    mockServer.use(http.get('*/api/staff/admin/users', async ({ request }) => {
      const url = new URL(request.url); reads.push(url); const term = url.searchParams.get('username'); if (term === 'older') await gate;
      return HttpResponse.json({ ...page(), items: [userDTO(term ?? 'mlopez')] });
    }));
    fireEvent.change(input, { target: { value: 'older' } }); expect(screen.getByRole('table')).toBe(table); expect(reads).toHaveLength(1);
    await waitFor(() => expect(reads.at(-1)?.searchParams.get('username')).toBe('older'));
    expect(screen.getByRole('table')).toBe(table); expect(screen.getByText('mlopez')).toBeInTheDocument(); expect(screen.getByText('Actualizando…')).toBeInTheDocument(); expect(input).toBeEnabled();
    fireEvent.change(input, { target: { value: 'newest' } }); await screen.findByText('newest'); await act(async () => release());
    expect(screen.queryByText('older')).not.toBeInTheDocument(); expect(screen.getByRole('table')).toBe(table); expect(input).toHaveValue('newest');
    expect(view.client.getQueryCache().findAll({ queryKey: ['staff-admin'] }).length).toBeGreaterThan(0);
  });
  it('sanitizes inaccessible detail and never exposes its data', async () => {
    mockServer.use(http.get(`*/api/staff/admin/users/${id}`, () => HttpResponse.json({ detail: 'internal' }, { status: 404 })));
    mount(); await screen.findByText('mlopez'); fireEvent.click(screen.getByRole('button', { name: 'Expandir información de mlopez' })); await screen.findByRole('alert');
    expect(screen.getByText('El usuario no existe o no está disponible para tu acceso actual.')).toBeInTheDocument(); expect(screen.queryByText('internal')).not.toBeInTheDocument();
  });
  it.each(['SUPER_ADMIN', 'GERENCIA'])('allows %s with effective permission', async roleId => { mocks.session.mockReturnValue({ ...mocks.session(), roleId }); mount(); await screen.findByText('mlopez'); });
  it.each(['RECEPCION', 'OPERACIONES', 'AUDITOR'])('blocks direct access for %s without permission', roleId => { mocks.session.mockReturnValue({ ...mocks.session(), roleId, permissions: [] }); mount(); expect(screen.queryByRole('heading', { name: 'Acceso denegado' })).not.toBeInTheDocument(); expect(mocks.replace).toHaveBeenCalledWith(roleId === 'RECEPCION' ? '/dashboard' : '/'); expect(reads).toHaveLength(0); });
  it('does not query under preview identity', () => { mocks.session.mockReturnValue({ ...mocks.session(), staffUserId: undefined }); mount(); expect(screen.getByText(/requiere autenticación real/)).toBeInTheDocument(); expect(reads).toHaveLength(0); });
  it.each([400, 401, 403, 404, 503])('handles %s safely without empty success', async status => {
    mockServer.use(http.get('*/api/staff/admin/users', () => HttpResponse.json({ code: status === 400 ? 'INVALID_CURSOR' : 'ERROR', detail: 'internal-secret' }, { status })));
    mount(); await screen.findByRole('alert'); expect(screen.queryByText(/internal-secret|No hay usuarios/)).not.toBeInTheDocument(); if (status === 401) await waitFor(() => expect(mocks.revalidate).toHaveBeenCalled()); if (status === 400) expect(screen.getByRole('button', { name: 'Volver al inicio del listado' })).toBeInTheDocument();
  });
  it('recovers explicitly from unavailable Backend', async () => {
    mockServer.use(http.get('*/api/staff/admin/users', () => new HttpResponse(null, { status: 503 }))); mount(); await screen.findByRole('alert'); mockServer.use(http.get('*/api/staff/admin/users', () => HttpResponse.json({ ...page(), items: [] }))); fireEvent.click(screen.getByRole('button', { name: 'Reintentar' })); await screen.findByText('No hay usuarios visibles en este contexto.');
  });
  it('distinguishes no matches from an empty context', async () => { mockServer.use(http.get('*/api/staff/admin/users', () => HttpResponse.json({ ...page(), items: [] }))); mount({ initial: { username: 'missing' } }); await screen.findByText('No existen coincidencias con estos filtros.'); });
  it('hides rows on refresh, cancels old scope, ignores late replies', async () => {
    const view = mount(); await screen.findByText('mlopez'); let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
    mockServer.use(http.get('*/api/staff/admin/users', async ({ request }) => { const url = new URL(request.url); if (url.searchParams.get('propertyId') === p1) await gate; return HttpResponse.json({ ...page(), scope: { kind: 'PROPERTY', propertyIds: [url.searchParams.get('propertyId')] }, items: [userDTO(url.searchParams.get('propertyId') === p1 ? 'late' : 'current')] }); }));
    act(() => { void view.client.invalidateQueries({ queryKey: ['staff-admin'] }); }); await waitFor(() => expect(screen.queryByText('mlopez')).not.toBeInTheDocument()); choose(p2); view.refresh(); await screen.findByText('current'); await act(async () => release()); expect(screen.queryByText('late')).not.toBeInTheDocument();
    await waitFor(() => expect(view.client.getQueryCache().findAll({ queryKey: ['staff-admin'] }).every(query => !JSON.stringify(query.queryKey).includes(`"PROPERTY",["${p1}"]`))).toBe(true));
  });
  it('recovers from an expired second-page cursor without reconstructing it', async () => {
    mockServer.use(http.get('*/api/staff/admin/users', ({ request }) => {
      const url = new URL(request.url); reads.push(url);
      if (url.searchParams.has('cursor')) return HttpResponse.json({ code: 'INVALID_CURSOR' }, { status: 400 });
      return HttpResponse.json({ ...page(), items: Array.from({ length: 50 }, (_, i) => ({ ...userDTO(`record${i}`), id: `${String(i).padStart(8, '0')}-4444-4444-8444-444444444444` })), nextCursor: 'signed-cursor' });
    }));
    mount(); const user = userEvent.setup(); await screen.findByText('record0');
    await user.click(screen.getByRole('button', { name: 'Página siguiente' })); await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: 'Volver al inicio del listado' })); await screen.findByText('record0');
    expect(reads.at(-1)?.searchParams.has('cursor')).toBe(false); expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled();
  });
  it('withdraws rows immediately when permissions change within the same session', async () => {
    const view = mount(); await screen.findByText('mlopez'); mocks.session.mockReturnValue({ ...mocks.session(), permissions: [] }); view.refresh();
    expect(screen.queryByText('mlopez')).not.toBeInTheDocument(); expect(screen.queryByRole('heading', { name: 'Acceso denegado' })).not.toBeInTheDocument(); expect(mocks.replace).toHaveBeenCalledWith('/dashboard');
    await waitFor(() => expect(view.client.getQueryCache().findAll({ queryKey: ['staff-admin'] })).toHaveLength(0));
  });
  it('does not reuse identity/organization context', async () => {
    const view = mount(); await screen.findByText('mlopez'); mocks.session.mockReturnValue({ ...mocks.session(), id: 'session-2' }); mockServer.use(http.get('*/api/staff/admin/roles', () => HttpResponse.json({ ...roleDTO(), organizationId: p2 }))); view.refresh(); expect(screen.queryByText('mlopez')).not.toBeInTheDocument(); await screen.findByRole('alert'); await waitFor(() => expect(mocks.revalidate).toHaveBeenCalled());
  });
  it('rejects invalid responses rather than returning an empty list', async () => { mockServer.use(http.get('*/api/staff/admin/roles', () => HttpResponse.json({ items: [] }))); mount(); await screen.findByRole('alert'); expect(reads).toHaveLength(0); });
});
describe('administrative mapper boundaries', () => {
  it('allowlists user fields, never exposes credentials', () => { const data = page(); Object.assign(data.items[0], { passwordHash: 'secret', accessToken: 'secret' }); expect(JSON.stringify(mapStaffAdminPage(data, context(), 50))).not.toContain('secret'); expect(mapStaffAdminContext(roleDTO()).roles).toHaveLength(5); });
  it.each(['organization', 'partial-assignment', 'scope', 'super-admin', 'empty', 'state', 'duplicate', 'cursor'])('rejects %s', kind => {
    const data = page(); if (kind === 'organization') data.organizationId = p2; if (kind === 'partial-assignment') data.items[0].propertyIds.push(id); if (kind === 'scope') data.scope.propertyIds = [p2]; if (kind === 'super-admin') data.items[0].roleCode = 'SUPER_ADMIN'; if (kind === 'empty') data.items[0].propertyIds = []; if (kind === 'state') data.items[0].status = 'DELETED'; if (kind === 'duplicate') data.items.push(userDTO()); if (kind === 'cursor') Object.assign(data, { nextCursor: 'cursor' }); expect(() => mapStaffAdminPage(data, context(), 50)).toThrow(DomainMappingError);
  });
  it('SUPER_ADMIN ALL can see zero properties and membership INACTIVE remains explicit', () => { const readContext = { ...context(), role: 'SUPER_ADMIN', scope: { kind: 'ALL_PROPERTIES' as const, propertyIds: [] } }; expect(mapStaffAdminDetail({ organizationId: org, scope: readContext.scope, item: { ...userDTO(), propertyIds: [], membershipStatus: 'INACTIVE' } }, readContext, id).membershipStatus).toBe('INACTIVE'); });
});

it('creates through the real BFF route and immediately shows the persisted result with three columns', async () => {
  const created = { ...userDTO('nuevo'), id: '55555555-5555-4555-8555-555555555555', workEmail: 'nuevo@hotel.test', roleCode: 'RECEPCION', version: 0 };
  const post = vi.fn(async ({ request }: { request: Request }) => {
    expect(await request.json()).toEqual({ username: 'nuevo', workEmail: 'nuevo@hotel.test', roleCode: 'RECEPCION', propertyIds: [p1, p2] });
    return HttpResponse.json(created, { status: 201 });
  });
  mockServer.use(http.post('*/api/staff/admin/users', post), http.get('*/api/staff/admin/users', ({ request }) => {
    const url = new URL(request.url); reads.push(url);
    return HttpResponse.json({ ...page(), items: post.mock.calls.length ? [userDTO(), created] : [userDTO()], limit: Number(url.searchParams.get('limit')) });
  }));
  mount(); const user = userEvent.setup(); await screen.findByText('mlopez');
  await user.click(screen.getByRole('button', { name: 'Crear usuario' }));
  const dialog = screen.getByRole('dialog', { name: 'Crear usuario' });
  expect(within(dialog).queryByRole('option', { name: 'SUPER_ADMIN' })).not.toBeInTheDocument();
  await user.type(within(dialog).getByLabelText('Nombre de usuario'), 'nuevo');
  await user.type(within(dialog).getByLabelText('Correo laboral'), 'nuevo@hotel.test');
  await user.click(within(dialog).getByRole('checkbox', { name: 'Hotel 2' }));
  await user.click(within(dialog).getByRole('button', { name: /^Crear$/ }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await screen.findByText('nuevo'); expect(post).toHaveBeenCalledOnce();
  expect(screen.getByText('mlopez')).toBeInTheDocument();
  expect(screen.getByLabelText('Buscar por username')).toHaveValue('');
  expect(reads.length).toBeGreaterThan(1);
  expect(reads.at(-1)?.searchParams.has('username')).toBe(false);
  expect(reads.at(-1)?.searchParams.get('scope')).toBe('PROPERTY');
  expect(reads.at(-1)?.searchParams.get('propertyId')).toBe(p1);
  expect(screen.getAllByRole('columnheader')).toHaveLength(3); expect(screen.getByRole('row', { name: /nuevo/ })).toHaveTextContent('Pendiente de activación');
});
it('blocks another create after uncertain response and reconciles by GET without replaying', async () => {
  let lost = false;
  const post = vi.fn(() => { lost = true; return HttpResponse.json({ code: 'STAFF_WRITE_UNAVAILABLE' }, { status: 503 }); });
  mockServer.use(http.post('*/api/staff/admin/users', post), http.get('*/api/staff/admin/users', ({ request }) => {
    const url = new URL(request.url); return HttpResponse.json({ ...page(), items: lost ? [{ ...userDTO('nuevo'), workEmail: 'nuevo@hotel.test', roleCode: 'RECEPCION', propertyIds: [p1] }] : [userDTO()], limit: Number(url.searchParams.get('limit')) });
  }));
  mount(); const user = userEvent.setup(); await screen.findByText('mlopez'); await user.click(screen.getByRole('button', { name: 'Crear usuario' }));
  await user.type(screen.getByLabelText('Nombre de usuario'), 'nuevo'); await user.type(screen.getByLabelText('Correo laboral'), 'nuevo@hotel.test');
  await user.click(screen.getByRole('button', { name: /^Crear$/ }));
  await screen.findByText(/No se pudo confirmar el resultado/); expect(screen.queryByRole('button', { name: /^Crear$/ })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Comprobar listado' })); await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(post).toHaveBeenCalledOnce(); await screen.findByText('nuevo');
});

it('preserves a rejected draft, validates property selection and can cancel without sending', async () => {
  const post = vi.fn(() => HttpResponse.json({ code: 'STAFF_EMAIL_CONFLICT' }, { status: 409 }));
  mockServer.use(http.post('*/api/staff/admin/users', post));
  mount(); const user = userEvent.setup(); await screen.findByText('mlopez'); await user.click(screen.getByRole('button', { name: 'Crear usuario' }));
  await user.type(screen.getByLabelText('Nombre de usuario'), 'nuevo'); await user.type(screen.getByLabelText('Correo laboral'), 'nuevo@hotel.test');
  await user.click(screen.getByRole('checkbox', { name: 'Hotel 1' })); await user.click(screen.getByRole('button', { name: /^Crear$/ }));
  await screen.findByText(/Selecciona un rol y propiedades autorizadas/); expect(post).not.toHaveBeenCalled();
  await user.click(screen.getByRole('checkbox', { name: 'Hotel 1' })); await user.click(screen.getByRole('button', { name: /^Crear$/ }));
  await screen.findByText(/usuario o correo ya está registrado/); expect(screen.getByLabelText('Nombre de usuario')).toHaveValue('nuevo');
  await user.click(screen.getByRole('button', { name: 'Cancelar' })); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(post).toHaveBeenCalledOnce();
});
it('submits only once while creation is in flight', async () => {
  let release!: () => void;
  const post = vi.fn(async () => { await new Promise<void>(resolve => { release = resolve; }); return HttpResponse.json({ ...userDTO('nuevo'), workEmail: 'nuevo@hotel.test', roleCode: 'RECEPCION', propertyIds: [p1] }, { status: 201 }); });
  mockServer.use(http.post('*/api/staff/admin/users', post));
  mount(); const user = userEvent.setup(); await screen.findByText('mlopez'); await user.click(screen.getByRole('button', { name: 'Crear usuario' }));
  await user.type(screen.getByLabelText('Nombre de usuario'), 'nuevo'); await user.type(screen.getByLabelText('Correo laboral'), 'nuevo@hotel.test');
  await user.dblClick(screen.getByRole('button', { name: /^Crear$/ }));
  await waitFor(() => expect(post).toHaveBeenCalledOnce()); expect(screen.getByRole('button', { name: 'Creando…' })).toBeDisabled();
  fireEvent.submit(document.getElementById('staff-create-form')!); expect(post).toHaveBeenCalledOnce();
  release(); await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

it('allows dismissing an uncertain create after GET proves an existing account has different data, without replaying', async () => {
  let sent = false;
  const post = vi.fn(() => { sent = true; return HttpResponse.json({ code: 'STAFF_WRITE_UNAVAILABLE' }, { status: 503 }); });
  mockServer.use(http.post('*/api/staff/admin/users', post), http.get('*/api/staff/admin/users', ({ request }) => {
    const url = new URL(request.url); return HttpResponse.json({ ...page(), items: sent ? [{ ...userDTO('nuevo'), workEmail: 'different@hotel.test' }] : [userDTO()], limit: Number(url.searchParams.get('limit')) });
  }));
  mount(); const user = userEvent.setup(); await screen.findByText('mlopez'); await user.click(screen.getByRole('button', { name: 'Crear usuario' }));
  await user.type(screen.getByLabelText('Nombre de usuario'), 'nuevo'); await user.type(screen.getByLabelText('Correo laboral'), 'nuevo@hotel.test');
  await user.click(screen.getByRole('button', { name: /^Crear$/ })); await screen.findByText(/No se pudo confirmar el resultado/);
  await user.click(screen.getByRole('button', { name: 'Comprobar listado' })); await screen.findByText(/Ese usuario existe con datos diferentes/);
  expect(screen.getByLabelText('Correo laboral')).toHaveValue('nuevo@hotel.test');
  expect(screen.queryByRole('button', { name: /^Crear$/ })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Cancelar' })); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(post).toHaveBeenCalledOnce();
});

it('clears search and filters and returns to the first scoped page after creation', async () => {
  const created = { ...userDTO('nuevo'), id: '55555555-5555-4555-8555-555555555555', workEmail: 'nuevo@hotel.test', roleCode: 'RECEPCION', propertyIds: [p1], version: 0 };
  const post = vi.fn(() => HttpResponse.json(created, { status: 201 }));
  mockServer.use(http.post('*/api/staff/admin/users', post), http.get('*/api/staff/admin/users', ({ request }) => {
    const url = new URL(request.url); reads.push(url);
    const limit = Number(url.searchParams.get('limit'));
    const first = Array.from({ length: limit }, (_, i) => ({ ...userDTO(`previo${i}`), id: `${String(i).padStart(8, '0')}-4444-4444-8444-444444444444` }));
    const items = post.mock.calls.length ? [userDTO(), created] : url.searchParams.has('cursor') ? [userDTO('previo-final')] : first;
    return HttpResponse.json({ ...page(), limit, items, nextCursor: !post.mock.calls.length && !url.searchParams.has('cursor') ? 'before-create' : null });
  }));
  mount({ initial: { username: 'previo', roleCode: 'GERENCIA', status: 'SUSPENDED', limit: 5 } });
  const user = userEvent.setup(); await screen.findByText('previo0');
  await user.click(screen.getByRole('button', { name: 'Página siguiente' })); await screen.findByText('previo-final');
  expect(reads.at(-1)?.searchParams.get('cursor')).toBe('before-create');
  await user.click(screen.getByRole('button', { name: 'Crear usuario' }));
  await user.type(screen.getByLabelText('Nombre de usuario'), 'nuevo'); await user.type(screen.getByLabelText('Correo laboral'), 'nuevo@hotel.test');
  await user.click(screen.getByRole('button', { name: /^Crear$/ }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await screen.findByText('nuevo'); expect(screen.getByText('mlopez')).toBeInTheDocument();
  expect(screen.getByLabelText('Buscar por username')).toHaveValue('');
  expect(screen.getByLabelText('Rol')).toHaveValue(''); expect(screen.getByLabelText('Estado')).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Página 1' })).toHaveAttribute('aria-current', 'page');
  const query = reads.at(-1)!.searchParams;
  for (const key of ['username', 'roleCode', 'status', 'cursor']) expect(query.has(key)).toBe(false);
  expect(query.get('scope')).toBe('PROPERTY'); expect(query.get('propertyId')).toBe(p1);
  expect(post).toHaveBeenCalledOnce(); expect(screen.getByRole('row', { name: /nuevo/ })).toHaveTextContent('Pendiente de activación');
});

const newStaffId = '55555555-5555-4555-8555-555555555555';
const newStaff = () => ({ ...userDTO('nuevo'), id: newStaffId, workEmail: 'nuevo@hotel.test', roleCode: 'RECEPCION', propertyIds: [p1], version: 0 });
async function fillCreation() {
  const user = userEvent.setup(); await screen.findByText('mlopez');
  await user.click(screen.getByRole('button', { name: 'Crear usuario' }));
  await user.type(screen.getByLabelText('Nombre de usuario'), 'nuevo');
  await user.type(screen.getByLabelText('Correo laboral'), 'nuevo@hotel.test');
  return user;
}
it('creation automatically invites the confirmed real ID once with its version and authorized scope', async () => {
  let release!: () => void;
  const post = vi.fn(() => HttpResponse.json(newStaff(), { status: 201 }));
  const invite = vi.fn(async ({ request }: { request: Request }) => {
    expect(post).toHaveBeenCalledOnce();
    const url = new URL(request.url);
    expect(url.pathname).toBe(`/api/staff/admin/users/${newStaffId}/invitation`);
    expect(url.searchParams.get('scope')).toBe('PROPERTY'); expect(url.searchParams.get('propertyId')).toBe(p1);
    expect(await request.json()).toEqual({ expectedVersion: 0 });
    await new Promise<void>(resolve => { release = resolve; });
    return HttpResponse.json({ organizationId: org, staffUserId: newStaffId, version: 1, changed: true });
  });
  mockServer.use(http.post('*/api/staff/admin/users', post), http.post('*/api/staff/admin/users/:staffId/invitation', invite));
  mount(); const user = await fillCreation(); await user.click(screen.getByRole('button', { name: /^Crear$/ }));
  const sending = await screen.findByRole('button', { name: 'Enviando invitación…' });
  expect(sending).toBeDisabled(); expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  fireEvent.submit(document.getElementById('staff-create-form')!); expect(post).toHaveBeenCalledOnce();
  release(); await screen.findByText('Usuario creado. Invitación enviada a su correo');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(invite).toHaveBeenCalledOnce();
});
it.each([400, 401, 403, 409, 503, 'network', 'invalid-ack'] as const)('creation remains confirmed after invitation %s without replaying either write', async failure => {
  const post = vi.fn(() => HttpResponse.json(newStaff(), { status: 201 }));
  const invite = vi.fn(() => failure === 'network' ? HttpResponse.error() : failure === 'invalid-ack' ? HttpResponse.json({ changed: true })
    : HttpResponse.json({ code: ({ 400: 'INVALID_REQUEST', 401: 'STAFF_SESSION_REQUIRED', 403: 'STAFF_ACCESS_DENIED', 409: 'STAFF_VERSION_CONFLICT', 503: 'STAFF_WRITE_UNAVAILABLE' })[failure] }, { status: failure }));
  mockServer.use(http.post('*/api/staff/admin/users', post), http.post('*/api/staff/admin/users/:staffId/invitation', invite),
    http.get('*/api/staff/admin/users', ({ request }) => HttpResponse.json({ ...page(), items: [userDTO(), newStaff()], limit: Number(new URL(request.url).searchParams.get('limit')) })));
  const view = mount(); const user = await fillCreation(); await user.click(screen.getByRole('button', { name: /^Crear$/ }));
  await screen.findByText('Usuario creado, pero no se pudo confirmar el envío de la invitación');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Invitación y activación de nuevo' })).toBeEnabled();
  expect(screen.getByRole('row', { name: /nuevo/ })).toHaveTextContent('Pendiente de activación');
  view.refresh(); expect(post).toHaveBeenCalledOnce(); expect(invite).toHaveBeenCalledOnce();
  if ([401, 403].includes(Number(failure))) expect(mocks.revalidate).toHaveBeenCalled();
});
it('uncertain creation recovered by GET never automatically sends an invitation', async () => {
  let committed = false;
  const post = vi.fn(() => { committed = true; return HttpResponse.json({ code: 'STAFF_WRITE_UNAVAILABLE' }, { status: 503 }); });
  const invite = vi.fn(() => HttpResponse.json({}));
  mockServer.use(http.post('*/api/staff/admin/users', post), http.post('*/api/staff/admin/users/:staffId/invitation', invite),
    http.get('*/api/staff/admin/users', ({ request }) => HttpResponse.json({ ...page(), items: committed ? [newStaff()] : [userDTO()], limit: Number(new URL(request.url).searchParams.get('limit')) })));
  mount(); const user = await fillCreation(); await user.click(screen.getByRole('button', { name: /^Crear$/ }));
  await screen.findByText(/No se pudo confirmar el resultado/);
  await user.click(screen.getByRole('button', { name: 'Comprobar listado' }));
  await screen.findByText('Usuario creado, pero no se pudo confirmar el envío de la invitación');
  expect(post).toHaveBeenCalledOnce(); expect(invite).not.toHaveBeenCalled();
});
