import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mockServer } from '@/data/mocks/server';
import { StaffAdminWorkspace } from '@/modules/staff';
import PrivateLayout from './layout';
import { navigationFilters } from './seguridad/usuarios/filters';
const route = vi.hoisted(() => ({ pathname: '/seguridad/usuarios' }));
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname, useRouter: () => navigation }));
const navigation = { replace: vi.fn(), push: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), bfcacheId: 'staff-admin-navigation' };
const org = '11111111-1111-4111-8111-111111111111', id = '44444444-4444-4444-8444-444444444444';
let client: QueryClient;
let session: { staffUserId: string; sessionId: string; username: string; roleCode: string; permissions: string[]; memberships: unknown[] };
let adminReads: string[];
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); navigation.replace.mockReset(); route.pathname = '/seguridad/usuarios'; vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false');
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); adminReads = [];
  session = { staffUserId: id, sessionId: 'navigation-session', username: 'admin', roleCode: 'SUPER_ADMIN', permissions: ['STAFF_MANAGE', 'MULTI_PROPERTY_READ'], memberships: [] };
  mockServer.use(http.get('*/api/auth/staff/session', () => HttpResponse.json(session)),
    http.get('*/api/staff/admin/roles', () => { adminReads.push('roles'); return HttpResponse.json({ organizationId: org, items: ['SUPER_ADMIN', 'GERENCIA', 'RECEPCION', 'OPERACIONES', 'AUDITOR'].map(code => ({ code, name: code })) }); }),
    http.get('*/api/staff/admin/users', ({ request }) => { adminReads.push(request.url); return HttpResponse.json({ organizationId: org, scope: { kind: 'ALL_PROPERTIES', propertyIds: [] }, items: [], limit: 50, nextCursor: null }); }));
});
afterEach(() => { cleanup(); client.clear(); vi.unstubAllEnvs(); });
function mount() { return render(<AppRouterContext.Provider value={navigation}><QueryClientProvider client={client}><PrivateLayout><StaffAdminWorkspace /></PrivateLayout></QueryClientProvider></AppRouterContext.Provider>); }
it('uses one sidebar and explicitly selects empty ALL only for SUPER_ADMIN admin reads', async () => {
  const user = userEvent.setup(); mount(); await screen.findByRole('heading', { name: 'Selecciona una propiedad' });
  expect(screen.getByRole('link', { name: 'Usuarios' })).toHaveAttribute('aria-current', 'page'); expect(screen.getAllByRole('complementary')).toHaveLength(1);
  const selector = screen.getByLabelText('Propiedad'); expect(selector).toBeEnabled(); expect(selector).toHaveValue(''); expect(adminReads).toEqual([]);
  await user.selectOptions(selector, 'ALL_PROPERTIES'); await screen.findByText('No hay usuarios visibles en este contexto.'); expect(adminReads.at(-1)).toContain('scope=ALL_PROPERTIES');
});
it.each(['GERENCIA', 'RECEPCION', 'OPERACIONES', 'AUDITOR'])('does not expose empty ALL for %s', async role => { session.roleCode = role; if (role !== 'GERENCIA') session.permissions = []; mount(); await screen.findByText('admin'); expect(screen.getByLabelText('Propiedad')).toBeDisabled(); expect(screen.queryByRole('option', { name: 'Todas mis propiedades' })).not.toBeInTheDocument(); if (role !== 'GERENCIA') expect(screen.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument(); expect(adminReads).toEqual([]); });
it('keeps empty ALL disabled on unrelated Staff routes', async () => { route.pathname = '/dashboard'; mount(); await screen.findByText('admin'); expect(screen.getByLabelText('Propiedad')).toBeDisabled(); });
it.each(['guest', 'invalid'])('existing Staff guard rejects %s session before displaying administrative data', async () => {
  mockServer.use(http.get('*/api/auth/staff/session', () => new HttpResponse(null, { status: 401 })), http.post('*/api/auth/staff/refresh', () => new HttpResponse(null, { status: 401 })));
  mount(); await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/acceso')); expect(adminReads).toEqual([]); expect(screen.queryByRole('heading', { name: 'Usuarios' })).not.toBeInTheDocument();
});
it('allowlists list/detail navigation filters, excludes cursor and organization', () => { expect(navigationFilters({ username: 'm%_', roleCode: 'GERENCIA', status: 'SUSPENDED', limit: '25', cursor: 'secret', organizationId: org })).toEqual({ username: 'm%_', roleCode: 'GERENCIA', status: 'SUSPENDED', limit: 25 }); expect(navigationFilters({ roleCode: 'NEW_ROLE', limit: '0', username: ['duplicate'] })).toEqual({ username: '', roleCode: '', status: '', limit: 50 }); });

it('withdraws administrative content during session revalidation and enforces revoked permission before querying', async () => {
  const user = userEvent.setup(); mount(); await screen.findByRole('heading', { name: 'Selecciona una propiedad' });
  await user.selectOptions(screen.getByLabelText('Propiedad'), 'ALL_PROPERTIES'); await screen.findByText('No hay usuarios visibles en este contexto.');
  const count = adminReads.length; let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  mockServer.use(http.get('*/api/auth/staff/session', async () => { await gate; return HttpResponse.json({ ...session, permissions: [] }); }));
  act(() => window.dispatchEvent(new Event('focus'))); await screen.findByText('Cargando sesión Staff…');
  expect(screen.queryByRole('heading', { name: 'Usuarios' })).not.toBeInTheDocument(); expect(screen.getByLabelText('Buscar por username')).not.toBeVisible(); expect(screen.getByLabelText('Buscar por username').closest('[data-staff-session-blocked]')).toHaveAttribute('inert'); expect(adminReads).toHaveLength(count);
  await act(async () => release()); await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/dashboard')); expect(screen.queryByRole('heading', { name: 'Acceso denegado' })).not.toBeInTheDocument(); expect(adminReads).toHaveLength(count);
  await waitFor(() => expect(client.getQueryCache().findAll({ queryKey: ['staff-admin'] })).toHaveLength(0));
});
it('keeps property feedback accessible and hides redundant context notices without UUIDs', async () => {
  const user = userEvent.setup(); mount(); await screen.findByRole('heading', { name: 'Selecciona una propiedad' });
  await user.selectOptions(screen.getByLabelText('Propiedad'), 'ALL_PROPERTIES');
  const notice = screen.getByText('Contexto cambiado a todas tus propiedades autorizadas.');
  expect(notice).toHaveAttribute('role', 'status'); expect(notice).toHaveStyle({ position: 'absolute', clipPath: 'inset(50%)' });
});

it.each([['RECEPCION', '/dashboard'], ['OPERACIONES', '/'], ['AUDITOR', '/'], ['GERENCIA', '/dashboard'], ['SUPER_ADMIN', '/dashboard']])('redirects %s without permission to %s without administrative queries or a denial screen', async (role, expected) => {
  session.roleCode = role; session.permissions = []; mount();
  await waitFor(() => expect(navigation.replace).toHaveBeenCalledExactlyOnceWith(expected));
  expect(adminReads).toEqual([]); expect(screen.queryByLabelText('Buscar por username')).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Acceso denegado' })).not.toBeInTheDocument();
});
it('enforces the same boundary on a future route under the users namespace', async () => {
  route.pathname = '/seguridad/usuarios/future'; session.roleCode = 'AUDITOR'; session.permissions = []; mount();
  await waitFor(() => expect(navigation.replace).toHaveBeenCalledExactlyOnceWith('/')); expect(adminReads).toEqual([]);
});

it.each([
  ['OPERACIONES', ['OPERATIONS_MANAGE'], '/housekeeping', 'Housekeeping'],
  ['AUDITOR', ['RESERVATION_MANAGE'], '/reportes', 'Reportes'],
  ['AUDITOR', ['COMMERCIAL_MANAGE'], '/reportes', 'Reportes'],
] as const)('main integration: denied %s keeps the authorized destination %s', async (role, permissions, expected, label) => {
  session.roleCode = role; session.permissions = [...permissions]; mount();
  await waitFor(() => expect(navigation.replace).toHaveBeenCalledExactlyOnceWith(expected));
  expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', expected);
  expect(screen.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Buscar por username')).not.toBeInTheDocument();
  expect(adminReads).toEqual([]);
});

it('main integration: authorized users retain housekeeping and reporting beside Users', async () => {
  session.permissions.push('OPERATIONS_MANAGE', 'COMMERCIAL_MANAGE'); mount();
  await screen.findByRole('heading', { name: 'Selecciona una propiedad' });
  for (const name of ['Housekeeping', 'Reportes', 'Usuarios']) expect(screen.getByRole('link', { name })).toBeInTheDocument();
  expect(adminReads).toEqual([]);
});

const property = '22222222-2222-4222-8222-222222222222', targetId = '66666666-6666-4666-8666-666666666666';
function inlineFixture() {
 session.memberships = [{ propertyId: property, propertyCode: 'QA', name: 'Hotel QA', timezone: 'America/Guatemala', currency: 'GTQ' }];
 let target = { id: targetId, username: 'focus.target', workEmail: 'focus@hotel.example', roleCode: 'RECEPCION', status: 'ACTIVE', membershipStatus: 'ACTIVE', organizationId: org, propertyIds: [property], version: 3, createdAt: '2026-10-23T00:00:00Z', updatedAt: '2026-10-23T00:00:00Z' };
 const commands: Record<string,unknown>[] = [], reads: string[] = [];
 mockServer.use(http.get('*/api/staff/admin/users',()=>{reads.push('list');return HttpResponse.json({organizationId:org,scope:{kind:'PROPERTY',propertyIds:[property]},items:[target],limit:50,nextCursor:null});}),
  http.get(`*/api/staff/admin/users/${targetId}`,()=>{reads.push('detail');return HttpResponse.json({organizationId:org,scope:{kind:'PROPERTY',propertyIds:[property]},item:target});}),
  http.patch(`*/api/staff/admin/users/${targetId}`,async({request})=>{const body=await request.json() as Record<string,unknown>;commands.push(body);if(body.expectedVersion!==target.version)return HttpResponse.json({code:'STAFF_VERSION_CONFLICT'},{status:409});target={...target,workEmail:body.workEmail as string,version:target.version+1};return HttpResponse.json({organizationId:org,staffUserId:targetId,version:target.version,changed:true});}));
 return {commands,reads};
}
async function pendingEmail() {
 await screen.findByText('focus.target');await userEvent.click(screen.getByRole('button',{name:'Editar correo de focus.target'}));
 const input=await screen.findByLabelText('Correo laboral');await waitFor(()=>expect(input).toHaveFocus());await userEvent.clear(input);await userEvent.type(input,'draft@hotel.example');return input;
}
it('focus revalidates the real session while preserving the exact inline subtree and its original version',async()=>{
 const fixture=inlineFixture();mount();const input=await pendingEmail();let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
 const auth=vi.fn(async()=>{await gate;return HttpResponse.json(session);});mockServer.use(http.get('*/api/auth/staff/session',auth));
 act(()=>window.dispatchEvent(new Event('blur')));fireEvent.blur(input);act(()=>window.dispatchEvent(new Event('focus')));await screen.findByText('Cargando sesión Staff…');
 expect(input).not.toBeVisible();expect(input).toHaveValue('draft@hotel.example');expect(input.closest('[data-staff-session-blocked]')).toHaveAttribute('inert');expect(fixture.commands).toHaveLength(0);
 await act(async()=>release());await waitFor(()=>expect(input).toBeVisible());expect(screen.getByLabelText('Correo laboral')).toBe(input);expect(input).toHaveValue('draft@hotel.example');expect(auth).toHaveBeenCalledTimes(1);expect(navigation.replace).not.toHaveBeenCalled();expect(navigation.refresh).not.toHaveBeenCalled();
 await userEvent.click(input);await userEvent.keyboard('{Enter}');await waitFor(()=>expect(screen.queryByRole('form')).not.toBeInTheDocument());expect(fixture.commands).toEqual([{workEmail:'draft@hotel.example',expectedVersion:3}]);
});
it('a temporary strict-session503 hides/inerts but does not discard an inline draft; retry restores it',async()=>{
 const fixture=inlineFixture();mount();const input=await pendingEmail();mockServer.use(http.get('*/api/auth/staff/session',()=>new HttpResponse(null,{status:503})));
 act(()=>window.dispatchEvent(new Event('blur')));act(()=>window.dispatchEvent(new Event('focus')));await screen.findByText('No se pudo cargar la sesión Staff.');expect(input.isConnected).toBe(true);expect(input).not.toBeVisible();expect(input).toHaveValue('draft@hotel.example');expect(fixture.commands).toHaveLength(0);
 mockServer.use(http.get('*/api/auth/staff/session',()=>HttpResponse.json(session)));await userEvent.click(screen.getByRole('button',{name:'Reintentar sesión'}));await waitFor(()=>expect(input).toBeVisible());expect(screen.getByLabelText('Correo laboral')).toBe(input);expect(fixture.commands).toHaveLength(0);
});
it('session revalidation still removes the draft and data on definitive logout, keeping Guest isolated',async()=>{
 const fixture=inlineFixture();mount();const input=await pendingEmail();client.setQueryDefaults(['guest-session'],{gcTime:Infinity});client.setQueryData(['guest-session'],{guest:'preserved'});
 mockServer.use(http.get('*/api/auth/staff/session',()=>new HttpResponse(null,{status:401})),http.post('*/api/auth/staff/refresh',()=>new HttpResponse(null,{status:401})));
 act(()=>window.dispatchEvent(new Event('blur')));act(()=>window.dispatchEvent(new Event('focus')));await waitFor(()=>expect(navigation.replace).toHaveBeenCalledWith('/acceso'));expect(input.isConnected).toBe(false);expect(screen.queryByText('focus.target')).not.toBeInTheDocument();expect(fixture.commands).toHaveLength(0);expect(client.getQueryData(['guest-session'])).toEqual({guest:'preserved'});
});
it('a property display-name refresh does not remount or discard an otherwise authorized draft',async()=>{
 const fixture=inlineFixture();mount();const input=await pendingEmail();session.memberships=[{propertyId:property,propertyCode:'QA',name:'Hotel renombrado',timezone:'America/Guatemala',currency:'GTQ'}];
 act(()=>window.dispatchEvent(new Event('blur')));act(()=>window.dispatchEvent(new Event('focus')));await waitFor(()=>expect(screen.getByLabelText('Propiedad')).toHaveAttribute('title','Hotel renombrado'));expect(screen.getByLabelText('Correo laboral')).toBe(input);expect(input).toHaveValue('draft@hotel.example');expect(fixture.commands).toHaveLength(0);
});
it('strict initial cached identity still cannot mount administrative queries before fresh verification',async()=>{
 inlineFixture();client.setQueryData(['auth','staff','session'],{id:'cached',staffUserId:id,userName:'cached',roleId:'SUPER_ADMIN',roleName:'SuperAdmin',permissions:['STAFF_MANAGE','MULTI_PROPERTY_READ'],memberships:[]});
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});mockServer.use(http.get('*/api/auth/staff/session',async()=>{await gate;return HttpResponse.json(session);}));mount();await screen.findByText('Cargando sesión Staff…');expect(adminReads).toEqual([]);expect(screen.queryByText('focus.target')).not.toBeInTheDocument();await act(async()=>release());await screen.findByText('focus.target');
});
it('permission revocation during a return-focus revalidation still destroys the draft and redirects',async()=>{
 const fixture=inlineFixture();mount();const input=await pendingEmail();mockServer.use(http.get('*/api/auth/staff/session',()=>HttpResponse.json({...session,permissions:[]})));
 act(()=>{window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'));});await waitFor(()=>expect(navigation.replace).toHaveBeenCalledWith('/dashboard'));expect(input.isConnected).toBe(false);expect(screen.queryByText('focus.target')).not.toBeInTheDocument();expect(fixture.commands).toHaveLength(0);
});
