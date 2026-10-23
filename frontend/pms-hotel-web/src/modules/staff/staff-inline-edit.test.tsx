import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mockServer } from '@/data/mocks/server';
import { StaffAdminWorkspace } from './index';
import { mapStaffCommandResult } from './mappers/staff-admin-command.mapper';
import { validateStaffDraft, staffDraft, canEditStaff } from './model/staff-admin-edit';
import type { StaffAdminUser } from './model/staff-admin';
import { DomainMappingError } from '@/lib/errors/domain-mapping-error';
const mocks = vi.hoisted(() => ({ session: vi.fn(), scope: vi.fn(), revalidate: vi.fn(), replace: vi.fn(), register: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock('@/modules/auth', () => ({ useStaffSession: mocks.session, useRevalidateStaffSession: () => mocks.revalidate }));
vi.mock('@/modules/properties', () => ({ usePropertyScope: mocks.scope }));
const org = '11111111-1111-4111-8111-111111111111', p1 = '22222222-2222-4222-8222-222222222222', p2 = '33333333-3333-4333-8333-333333333333', id = '44444444-4444-4444-8444-444444444444', actor = '55555555-5555-4555-8555-555555555555';
const codes = ['SUPER_ADMIN', 'GERENCIA', 'RECEPCION', 'OPERACIONES', 'AUDITOR'];
let record: StaffAdminUser, commands: { method: string; body: Record<string, unknown>; url: URL }[], detailReads: number;
let guard: ((proceed: () => void) => void) | undefined;
const clients: QueryClient[] = [];
const scope = () => mocks.scope().scope;
function reply(status: number, code: string) { return HttpResponse.json({ status, code, type: 'about:blank', title: 'safe' }, { status }); }
function detail() { detailReads++; return HttpResponse.json({ organizationId: org, scope: scope(), item: record }); }
function capture(method: string) { return async ({ request }: { request: Request }) => { commands.push({ method, body: await request.json() as Record<string, unknown>, url: new URL(request.url) }); }; }
async function command({ request }: { request: Request }) {
 const body = await request.json() as Record<string, unknown>; commands.push({ method: request.method, body, url: new URL(request.url) });
 if (body.expectedVersion !== record.version) return reply(409, 'STAFF_VERSION_CONFLICT');
 record = { ...record, ...(body.workEmail ? { workEmail: body.workEmail as string } : { roleCode: body.roleCode as StaffAdminUser['roleCode'], propertyIds: body.propertyIds as string[] }), version: record.version + 1 };
 return HttpResponse.json({ organizationId: org, staffUserId: id, version: record.version, changed: true });
}
function mount() {
 const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clients.push(client);
 const view = render(<QueryClientProvider client={client}><StaffAdminWorkspace /></QueryClientProvider>);
 return { ...view, client, refresh: () => view.rerender(<QueryClientProvider client={client}><StaffAdminWorkspace /></QueryClientProvider>) };
}
async function expand() { fireEvent.click(await screen.findByText('mlopez')); await screen.findByText('Creación'); }
async function edit(group = 'correo') {
 await userEvent.click(screen.getByRole('button', { name: `Editar ${group} de mlopez` }));
 await waitFor(() => expect(group === 'correo' ? screen.getByLabelText('Correo laboral') : group === 'rol' ? screen.getByLabelText('Rol Staff') : screen.getByLabelText('Hotel 1')).toBeEnabled());
}
async function apply() {
 const form = screen.queryByRole('form');
 if (form) fireEvent.keyDown(form.querySelector('input, select') ?? form, { key: 'Enter', code: 'Enter', ctrlKey: !!form.querySelector('fieldset') });
}
async function discard() { const form = screen.queryByRole('form'); if (form) fireEvent.keyDown(form, { key: 'Escape', code: 'Escape' }); }

async function saved() { await waitFor(()=>expect(screen.queryByRole('form')).not.toBeInTheDocument()); }
async function recovered() { await waitFor(()=>{ expect(screen.queryByRole('button',{name:'Actualizar usuario'})).not.toBeInTheDocument(); expect(screen.getByRole('form').querySelector('input, select')).toBeEnabled(); }); }
async function save() { await apply(); await saved(); }
beforeEach(() => {
 commands = []; detailReads = 0; guard = undefined; mocks.revalidate.mockReset(); mocks.replace.mockReset();
 record = { id, username: 'mlopez', workEmail: 'mlopez@hotel.example', status: 'ACTIVE', roleCode: 'RECEPCION', membershipStatus: 'ACTIVE', organizationId: org, propertyIds: [p1,p2], createdAt: '2026-10-22T00:00:00Z', updatedAt: '2026-10-22T00:00:00Z', version: 1 };
 mocks.register.mockImplementation(fn => { guard = fn; return () => { guard = undefined; }; });
 mocks.scope.mockReturnValue({ ready: true, scope: { kind: 'ALL_PROPERTIES', propertyIds: [p1,p2] }, registerSelectionGuard: mocks.register });
 mocks.session.mockReturnValue({ id: 'session-1', staffUserId: actor, roleId: 'SUPER_ADMIN', permissions: ['STAFF_MANAGE','MULTI_PROPERTY_READ'], memberships: [p1,p2].map((propertyId,i) => ({ propertyId, name: `Hotel ${i+1}`, active: true, timezone: 'America/Guatemala', currency: 'GTQ', propertyCode: null })) });
 mockServer.use(
  http.get('*/api/staff/admin/roles', () => HttpResponse.json({ organizationId: org, items: codes.map(code => ({ code, name: code })) })),
  http.get('*/api/staff/admin/users', () => HttpResponse.json({ organizationId: org, scope: scope(), items: [record], limit: 50, nextCursor: null })),
  http.get(`*/api/staff/admin/users/${id}`, detail),
  http.patch(`*/api/staff/admin/users/${id}`, command), http.put(`*/api/staff/admin/users/${id}/membership`, command),
 );
});
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.unstubAllEnvs(); });
it.each(['false','true'])('edits real email with mocks=%s, preserves three cells, keyboard focus and on-demand reads', async flag => {
 vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API',flag); mount(); await screen.findByText('mlopez'); expect(detailReads).toBe(0); await expand(); await edit();
 const input = screen.getByLabelText('Correo laboral'); expect(input).toHaveFocus(); expect(input).toHaveValue(record.workEmail); expect(commands).toHaveLength(0);
 expect(screen.getAllByRole('columnheader').map(el=>el.textContent)).toEqual(['Usuario','Acceso','Asignación']); expect(input.closest('tr')?.querySelectorAll('td')).toHaveLength(3);
 await userEvent.clear(input); await userEvent.type(input,'Person@HOTEL.example'); await save();
 expect(commands).toHaveLength(1); expect(commands[0].body).toEqual({workEmail:'person@hotel.example',expectedVersion:1}); expect(commands[0].url.searchParams.get('scope')).toBe('ALL_PROPERTIES');
 expect(screen.getByText('person@hotel.example')).toBeInTheDocument(); expect(screen.getByText('Creación')).toBeVisible(); expect(screen.getByRole('button',{name:'Editar correo de mlopez'})).toHaveFocus();
 expect(screen.queryByRole('button',{name:/Suspender|Dar de baja|Reactivar/})).not.toBeInTheDocument();
});
it('validates email, canonical no-op, Enter inside input, and cancel returns focus without a write', async()=>{
 mount(); await expand(); await edit(); const input=screen.getByLabelText('Correo laboral');
 await userEvent.clear(input); await userEvent.type(input,'invalid'); expect(screen.getByRole('alert')).toHaveTextContent('correo válido'); expect(screen.queryByRole('button',{name:'Guardar'})).not.toBeInTheDocument();
 await userEvent.clear(input); await userEvent.type(input,'MLOPEZ@HOTEL.EXAMPLE'); expect(screen.queryByRole('button',{name:'Guardar'})).not.toBeInTheDocument();
 fireEvent.keyDown(input,{key:' ',code:'Space'}); expect(screen.getByRole('button',{name:'Contraer información de mlopez'})).toHaveAttribute('aria-expanded','true');
 await discard(); expect(screen.getByRole('button',{name:'Editar correo de mlopez'})).toHaveFocus(); expect(commands).toHaveLength(0);
});
it.each(['role-first','properties-first'])('coordinates full membership and canonical versions: %s',async order=>{
 mount(); await expand();
 const role=async()=>{await edit('rol');expect(within(screen.getByLabelText('Rol Staff')).queryByRole('option',{name:'SUPER_ADMIN'})).not.toBeInTheDocument();await userEvent.selectOptions(screen.getByLabelText('Rol Staff'),'AUDITOR');await save();};
 const properties=async()=>{await edit('propiedades');expect(screen.getByLabelText('Hotel 1')).toBeChecked();await userEvent.click(screen.getByLabelText('Hotel 2'));await save();};
 if(order==='role-first'){await role();await properties();expect(commands[0].body).toEqual({roleCode:'AUDITOR',propertyIds:[p1,p2],expectedVersion:1});expect(commands[1].body).toEqual({roleCode:'AUDITOR',propertyIds:[p1],expectedVersion:2});}
 else{await properties();await role();expect(commands[0].body).toEqual({roleCode:'RECEPCION',propertyIds:[p1],expectedVersion:1});expect(commands[1].body).toEqual({roleCode:'AUDITOR',propertyIds:[p1],expectedVersion:2});}
 expect(record.version).toBe(3);
});
it('does not overwrite another group draft; prevents collapse, navigation and second edit while editing',async()=>{
 mount();await expand();await edit();await userEvent.clear(screen.getByLabelText('Correo laboral'));await userEvent.type(screen.getByLabelText('Correo laboral'),'draft@example.test');
 expect(screen.getByRole('button',{name:'Editar rol de mlopez'})).toBeDisabled();expect(screen.getByRole('button',{name:'Contraer información de mlopez'})).toBeDisabled();expect(screen.getByLabelText('Buscar por username')).toBeDisabled();
 fireEvent.click(screen.getAllByText('RECEPCION').find(element => element.tagName === 'STRONG')!);expect(screen.getByLabelText('Correo laboral')).toHaveValue('draft@example.test');expect(screen.getByText('Creación')).toBeVisible();
});
it.each([['ACTIVE','SUPER_ADMIN',false],['SUSPENDED','GERENCIA',false],['SUSPENDED','SUPER_ADMIN',true]] as const)('empty membership %s actor %s allowed=%s',async(status,role,allowed)=>{
 record={...record,status};mocks.session.mockReturnValue({...mocks.session(),roleId:role});mount();await expand();await edit('propiedades');
 await userEvent.click(screen.getByLabelText('Hotel 1'));await userEvent.click(screen.getByLabelText('Hotel 2'));
 expect(screen.queryByRole('button',{name:'Guardar'})).not.toBeInTheDocument();
 if(allowed){await save();expect(commands[0].body.propertyIds).toEqual([]);}else expect(screen.getByRole('alert')).toHaveTextContent('al menos una propiedad');
});
it('PROPERTY cannot remove every property even for a suspended user and SUPER_ADMIN',async()=>{
 record={...record,status:'SUSPENDED'};mocks.scope.mockReturnValue({...mocks.scope(),scope:{kind:'PROPERTY',propertyIds:[p1]}});mount();await expand();await edit('propiedades');await userEvent.click(screen.getByLabelText('Hotel 1'));await userEvent.click(screen.getByLabelText('Hotel 2'));expect(screen.queryByRole('button',{name:'Guardar'})).not.toBeInTheDocument();
});
it.each(['self','disabled','super-membership','manager-super'])('prevents forbidden editors: %s',async kind=>{
 if(kind==='self')mocks.session.mockReturnValue({...mocks.session(),staffUserId:id});
 if(kind==='disabled')record={...record,status:'DISABLED'};
 if(kind==='super-membership'||kind==='manager-super')record={...record,roleCode:'SUPER_ADMIN'};
 if(kind==='manager-super')mocks.session.mockReturnValue({...mocks.session(),roleId:'GERENCIA'});
 mount(); if(kind==='manager-super'){await screen.findByRole('alert');expect(screen.queryByText('mlopez')).not.toBeInTheDocument();return;}await expand();
 expect(screen.queryByRole('button',{name:'Editar rol de mlopez'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Editar propiedades de mlopez'})).not.toBeInTheDocument();
 expect(!!screen.queryByRole('button',{name:'Editar correo de mlopez'})).toBe(kind==='super-membership');
});
it('preserves draft after409; explicit GET reviews concurrent properties and requires another Save',async()=>{
 mockServer.use(http.put(`*/api/staff/admin/users/${id}/membership`,async args=>{if(commands.length===0){await capture('PUT')(args);record={...record,propertyIds:[p2],version:2};return reply(409,'STAFF_VERSION_CONFLICT');}return command(args);}));
 mount();await expand();await edit('rol');await userEvent.selectOptions(screen.getByLabelText('Rol Staff'),'AUDITOR');await apply();await screen.findByText(/La información cambió/);
 expect(screen.getByLabelText('Rol Staff')).toHaveValue('AUDITOR');expect(screen.queryByRole('button',{name:'Guardar'})).not.toBeInTheDocument();
 await userEvent.click(screen.getByRole('button',{name:'Actualizar usuario'}));await recovered();expect(commands).toHaveLength(1);expect(within(screen.getByLabelText('Rol Staff')).getByRole('option',{selected:true})).toHaveTextContent('AUDITOR');
 expect(screen.getByLabelText('Rol Staff')).toHaveValue('');await userEvent.selectOptions(screen.getByLabelText('Rol Staff'),within(screen.getByLabelText('Rol Staff')).getAllByRole('option',{name:'AUDITOR'}).find(option=>!(option as HTMLOptionElement).disabled)!);await saved();expect(commands.at(-1)?.body).toEqual({roleCode:'AUDITOR',propertyIds:[p2],expectedVersion:2});
});
it.each(['503','network','invalid-ack'])('uncertain %s blocks writes until explicit GET; never refreshes/retries',async scenario=>{
 mockServer.use(http.patch(`*/api/staff/admin/users/${id}`,async args=>{await capture('PATCH')(args);return scenario==='503'?reply(503,'STAFF_WRITE_UNAVAILABLE'):scenario==='network'?HttpResponse.error():HttpResponse.json({organizationId:org,staffUserId:id,version:99,changed:true});}));
 mount();await expand();await edit();await userEvent.clear(screen.getByLabelText('Correo laboral'));await userEvent.type(screen.getByLabelText('Correo laboral'),'draft@example.test');await apply();await screen.findByText(/No se pudo confirmar el resultado/);
 expect(commands).toHaveLength(1);expect(mocks.revalidate).not.toHaveBeenCalled();expect(screen.queryByRole('button',{name:'Guardar'})).not.toBeInTheDocument();expect(screen.getByLabelText('Correo laboral')).toBeDisabled();
 await userEvent.click(screen.getByRole('button',{name:'Actualizar usuario'}));await recovered();expect(screen.getByLabelText('Correo laboral')).toHaveValue('draft@example.test');expect(commands).toHaveLength(1);expect(screen.getByLabelText('Correo laboral')).toBeEnabled();
});
it('committed but lost ack is reconciled without claiming success or replaying',async()=>{
 mockServer.use(http.patch(`*/api/staff/admin/users/${id}`,async args=>{await capture('PATCH')(args);record={...record,workEmail:'saved@example.test',version:2};return reply(503,'STAFF_WRITE_UNAVAILABLE');}));
 mount();await expand();await edit();await userEvent.clear(screen.getByLabelText('Correo laboral'));await userEvent.type(screen.getByLabelText('Correo laboral'),'saved@example.test');await apply();await screen.findByText(/No se pudo confirmar/);await userEvent.click(screen.getByRole('button',{name:'Actualizar usuario'}));await recovered();expect(screen.queryByRole('button',{name:'Guardar'})).not.toBeInTheDocument();expect(screen.queryByText('Guardado. Información actualizada.')).not.toBeInTheDocument();expect(commands).toHaveLength(1);
});
it.each([400,401,403,404,409])('handles HTTP%i without success or automatic write retry',async status=>{
 const code=status===400?'INVALID_REQUEST':status===401?'STAFF_SESSION_REQUIRED':status===403?'STAFF_ACCESS_DENIED':status===404?'STAFF_USER_NOT_FOUND':'STAFF_EMAIL_CONFLICT';
 mockServer.use(http.patch(`*/api/staff/admin/users/${id}`,async args=>{await capture('PATCH')(args);return reply(status,code);}));mount();await expand();await edit();await userEvent.clear(screen.getByLabelText('Correo laboral'));await userEvent.type(screen.getByLabelText('Correo laboral'),'different@example.test');await apply();
 await waitFor(()=>expect(commands).toHaveLength(1));
 if(status===401||status===403){await screen.findByText('Verificando tu acceso Staff…');expect(screen.queryByText('mlopez')).not.toBeInTheDocument();expect(mocks.revalidate).toHaveBeenCalled();}
 else if(status===404)await screen.findByText('El usuario ya no está disponible en este contexto.');
 else await screen.findByText(status===400?'La solicitud no es válida. Revisa los datos antes de guardar.':'El correo no está disponible. Escribe otro correo.');
 expect(screen.queryByText('Guardado. Información actualizada.')).not.toBeInTheDocument();
});
it('prevents double submit even before React renders saving',async()=>{
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
 mockServer.use(http.patch(`*/api/staff/admin/users/${id}`,async args=>{await capture('PATCH')(args);await gate;record={...record,workEmail:'new@example.test',version:2};return HttpResponse.json({organizationId:org,staffUserId:id,version:2,changed:true});}));
 mount();await expand();await edit();await userEvent.clear(screen.getByLabelText('Correo laboral'));await userEvent.type(screen.getByLabelText('Correo laboral'),'new@example.test');const form=screen.getByRole('form',{name:'Editar correo de mlopez'});fireEvent.submit(form);fireEvent.submit(form);await waitFor(()=>expect(commands).toHaveLength(1));await act(async()=>release());await saved();expect(commands).toHaveLength(1);
});
it('guards property changes: cancel preserves draft; confirmation discards before switching',async()=>{
 mount();await expand();await edit();const proceed=vi.fn();act(()=>guard?.(proceed));await screen.findByRole('dialog');await userEvent.click(screen.getByRole('button',{name:'Volver'}));expect(proceed).not.toHaveBeenCalled();expect(screen.getByLabelText('Correo laboral')).toBeInTheDocument();
 act(()=>guard?.(proceed));await userEvent.click(screen.getByRole('button',{name:'Descartar y cambiar'}));expect(proceed).toHaveBeenCalledOnce();expect(screen.queryByLabelText('Correo laboral')).not.toBeInTheDocument();expect(commands).toHaveLength(0);
});
it('retains uncertain lock through a component remount; a different session cannot see the old draft',async()=>{
 mockServer.use(http.patch(`*/api/staff/admin/users/${id}`,async args=>{await capture('PATCH')(args);return reply(503,'STAFF_WRITE_UNAVAILABLE');}));
 const view=mount();await expand();await edit();await userEvent.clear(screen.getByLabelText('Correo laboral'));await userEvent.type(screen.getByLabelText('Correo laboral'),'private@example.test');await apply();await screen.findByText(/No se pudo confirmar/);
 mocks.scope.mockReturnValue({...mocks.scope(),scope:{kind:'PROPERTY',propertyIds:[p1]}});view.refresh();await expand();await userEvent.click(screen.getByRole('button',{name:'Editar correo de mlopez'}));await screen.findByText(/Hay un resultado pendiente/);expect(screen.queryByRole('button',{name:'Guardar'})).not.toBeInTheDocument();
 mocks.session.mockReturnValue({...mocks.session(),id:'session-2'});view.refresh();await expand();await edit();expect(screen.getByLabelText('Correo laboral')).toHaveValue('mlopez@hotel.example');expect(commands).toHaveLength(1);
});
it('ignores late acknowledgements after forced identity changes',async()=>{
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});mockServer.use(http.patch(`*/api/staff/admin/users/${id}`,async args=>{await capture('PATCH')(args);await gate;return HttpResponse.json({organizationId:org,staffUserId:id,version:2,changed:true});}));
 const view=mount();await expand();await edit();await userEvent.clear(screen.getByLabelText('Correo laboral'));await userEvent.type(screen.getByLabelText('Correo laboral'),'old@example.test');await apply();await waitFor(()=>expect(commands).toHaveLength(1));mocks.session.mockReturnValue({...mocks.session(),id:'new-session'});view.refresh();await screen.findByText('mlopez');await act(async()=>release());expect(screen.queryByText('Guardado. Información actualizada.')).not.toBeInTheDocument();expect(screen.getByText('mlopez@hotel.example')).toBeInTheDocument();
});
it('preserves no-op acknowledgement version and explicitly reconciles via GET',async()=>{
 mockServer.use(http.patch(`*/api/staff/admin/users/${id}`,async args=>{await capture('PATCH')(args);return HttpResponse.json({organizationId:org,staffUserId:id,version:1,changed:false});}));mount();await expand();await edit();await userEvent.clear(screen.getByLabelText('Correo laboral'));await userEvent.type(screen.getByLabelText('Correo laboral'),'same@example.test');await apply();await saved();expect(record.version).toBe(1);expect(commands).toHaveLength(1);
});
it('validates domain drafts and projects no tokens, organization overrides or unsafe ack versions',()=>{
 const draft=staffDraft(record),session=mocks.session();expect(canEditStaff(record,session,'email')).toBe(true);
 expect(validateStaffDraft('email',{...draft,email:'a'.repeat(46)+'@a.co'},record,session,scope())).toMatch(/50/);
 expect(validateStaffDraft('role',{...draft,role:'SUPER_ADMIN'},record,session,scope())).toMatch(/rol asignable/);
 expect(validateStaffDraft('properties',{...draft,properties:[org]},record,session,scope())).toMatch(/autorizadas/);
 for(const ack of [{organizationId:p1,staffUserId:id,version:2,changed:true},{organizationId:org,staffUserId:id,version:7,changed:true},{organizationId:org,staffUserId:id,version:2,changed:true,accessToken:'secret'}])expect(()=>mapStaffCommandResult(ack,org,id,1)).toThrow(DomainMappingError);
});
it('confirmed200 followed by unavailable GET stays confirmed and blocks editing until recovery',async()=>{
 let unavailable=false;
 mockServer.use(http.get(`*/api/staff/admin/users/${id}`,()=>unavailable?reply(503,'STAFF_READ_UNAVAILABLE'):detail()),http.patch(`*/api/staff/admin/users/${id}`,async args=>{const response=await command(args);unavailable=true;return response;}));
 mount();await expand();await edit();await userEvent.clear(screen.getByLabelText('Correo laboral'));await userEvent.type(screen.getByLabelText('Correo laboral'),'confirmed@example.test');await apply();
 await screen.findByText('Guardado; no se pudo actualizar la información. Comprueba el estado antes de editar.');expect(screen.queryByRole('button',{name:'Guardar'})).not.toBeInTheDocument();expect(commands).toHaveLength(1);
 unavailable=false;await userEvent.click(screen.getByRole('button',{name:'Actualizar usuario'}));await saved();expect(commands).toHaveLength(1);expect(screen.getByText('confirmed@example.test')).toBeInTheDocument();
});
it('membership may leave the selected property: confirms200 then scoped404 without claiming failure',async()=>{
 mocks.scope.mockReturnValue({...mocks.scope(),scope:{kind:'PROPERTY',propertyIds:[p1]}});
 mockServer.use(http.get(`*/api/staff/admin/users/${id}`,()=>record.propertyIds.includes(p1)?detail():reply(404,'STAFF_USER_NOT_FOUND')),http.get('*/api/staff/admin/users',()=>HttpResponse.json({organizationId:org,scope:scope(),items:record.propertyIds.includes(p1)?[record]:[],limit:50,nextCursor:null})));
 mount();await expand();await edit('propiedades');await userEvent.click(screen.getByLabelText('Hotel 1'));await apply();await screen.findByText('Guardado. El usuario ya no está disponible en este contexto.');expect(screen.queryByText('mlopez')).not.toBeInTheDocument();expect(commands[0].body.propertyIds).toEqual([p2]);expect(commands).toHaveLength(1);
});
it('failed recovery retains uncertain lock and draft, including after remount',async()=>{
 let unavailable=false;mockServer.use(http.get(`*/api/staff/admin/users/${id}`,()=>unavailable?reply(503,'STAFF_READ_UNAVAILABLE'):detail()),http.patch(`*/api/staff/admin/users/${id}`,async args=>{await capture('PATCH')(args);unavailable=true;return reply(503,'STAFF_WRITE_UNAVAILABLE');}));
 mount();await expand();await edit();await userEvent.clear(screen.getByLabelText('Correo laboral'));await userEvent.type(screen.getByLabelText('Correo laboral'),'unsure@example.test');await apply();await screen.findByText(/No se pudo confirmar/);await userEvent.click(screen.getByRole('button',{name:'Actualizar usuario'}));await screen.findByText('No se pudo comprobar el estado. Conservamos tu borrador; no vuelvas a enviar todavía.');expect(screen.queryByRole('button',{name:'Guardar'})).not.toBeInTheDocument();expect(screen.getByLabelText('Correo laboral')).toHaveValue('unsure@example.test');expect(commands).toHaveLength(1);
});
it('revalidates the counterpart before opening role editor instead of using the list snapshot',async()=>{
 mount();await expand();record={...record,propertyIds:[p2],version:4};await edit('rol');await userEvent.selectOptions(screen.getByLabelText('Rol Staff'),'AUDITOR');await save();expect(commands[0].body).toEqual({roleCode:'AUDITOR',propertyIds:[p2],expectedVersion:4});
});
it('withdraws an inline draft immediately after effective permission loss',async()=>{
 const view=mount();await expand();await edit();mocks.session.mockReturnValue({...mocks.session(),permissions:[]});view.refresh();expect(screen.queryByLabelText('Correo laboral')).not.toBeInTheDocument();expect(screen.queryByText('mlopez')).not.toBeInTheDocument();expect(mocks.replace).toHaveBeenCalledWith('/dashboard');expect(commands).toHaveLength(0);
});
it('prevents property changes while a write is uncertain',async()=>{
 mockServer.use(http.patch(`*/api/staff/admin/users/${id}`,async args=>{await capture('PATCH')(args);return reply(503,'STAFF_WRITE_UNAVAILABLE');}));mount();await expand();await edit();await userEvent.clear(screen.getByLabelText('Correo laboral'));await userEvent.type(screen.getByLabelText('Correo laboral'),'unsure@example.test');await apply();await screen.findByText(/No se pudo confirmar/);const proceed=vi.fn();act(()=>guard?.(proceed));expect(proceed).not.toHaveBeenCalled();expect(screen.getByText('Comprueba el resultado de esta cuenta antes de cambiar de propiedad.')).toBeInTheDocument();expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('clicks the actual email content directly from a collapsed row, with one current GET and no edit chrome',async()=>{
 mount();await screen.findByText('mlopez');const content=screen.getByRole('button',{name:'Editar correo de mlopez'});
 expect(content).toHaveTextContent('mlopez@hotel.example');expect(content).toHaveAccessibleDescription('mlopez@hotel.example');expect(content).not.toHaveTextContent('Editar');expect(detailReads).toBe(0);
 await edit();expect(screen.getByLabelText('Correo laboral')).toHaveFocus();await screen.findByText('Creación');expect(detailReads).toBe(1);
 expect(screen.queryByRole('button',{name:/^(Editar|Guardar|Cancelar)$/})).not.toBeInTheDocument();expect(screen.queryByText(/^Editar (correo|rol|propiedades)$/)).not.toBeInTheDocument();
 await discard();expect(content.isConnected).toBe(false);expect(screen.getByRole('button',{name:'Editar correo de mlopez'})).toHaveFocus();expect(commands).toHaveLength(0);
});
it.each(['Enter','Space'])('keyboard %s activates value editing without closing the row',async key=>{
 mount();await screen.findByText('mlopez');const target=screen.getByRole('button',{name:'Editar correo de mlopez'});target.focus();await userEvent.keyboard(key==='Enter'?'{Enter}':' ');await screen.findByLabelText('Correo laboral');await waitFor(()=>expect(screen.getByLabelText('Correo laboral')).toHaveFocus());expect(screen.getByRole('button',{name:'Contraer información de mlopez'})).toHaveAttribute('aria-expanded','true');await discard();expect(commands).toHaveLength(0);
});
it('email Enter followed by blur sends once; unrelated late blur cannot apply another group',async()=>{
 mount();await screen.findByText('mlopez');await edit();const input=screen.getByLabelText('Correo laboral');await userEvent.clear(input);await userEvent.type(input,'enter@example.test');fireEvent.keyDown(input,{key:'Enter'});fireEvent.blur(input);await saved();expect(commands).toHaveLength(1);
 await edit('propiedades');fireEvent.blur(input);await new Promise(resolve=>setTimeout(resolve,20));expect(commands).toHaveLength(1);expect(screen.getByLabelText('Hotel 1')).toBeInTheDocument();await discard();
});
it('email blur commits once and does not steal focus back from the destination',async()=>{
 mount();await screen.findByText('mlopez');await edit();const input=screen.getByLabelText('Correo laboral');await userEvent.clear(input);await userEvent.type(input,'blur@example.test');
 const outside=document.createElement('button');outside.textContent='Siguiente control de prueba';document.body.append(outside);
 try{await userEvent.click(outside);await saved();expect(commands).toHaveLength(1);expect(commands[0].body).toEqual({workEmail:'blur@example.test',expectedVersion:1});expect(outside).toHaveFocus();}finally{outside.remove();}
});
it('invalid email blur never submits and does not trap focus; Escape discards after validation',async()=>{
 mount();await screen.findByText('mlopez');await edit();await userEvent.clear(screen.getByLabelText('Correo laboral'));await userEvent.type(screen.getByLabelText('Correo laboral'),'invalid');
 const outside=document.createElement('button');outside.textContent='Fuera';document.body.append(outside);
 try{await userEvent.click(outside);await waitFor(()=>expect(screen.getByLabelText('Correo laboral')).toHaveAttribute('aria-invalid','true'));expect(commands).toHaveLength(0);expect(outside).toHaveFocus();await userEvent.click(screen.getByLabelText('Correo laboral'));await discard();expect(screen.queryByLabelText('Correo laboral')).not.toBeInTheDocument();expect(commands).toHaveLength(0);}finally{outside.remove();}
});
it('unchanged email blur closes without HTTP and Escape never saves a changed email',async()=>{
 mount();await screen.findByText('mlopez');await edit();const outside=document.createElement('button');outside.textContent='Fuera';document.body.append(outside);
 try{await userEvent.click(outside);await waitFor(()=>expect(screen.queryByLabelText('Correo laboral')).not.toBeInTheDocument());expect(commands).toHaveLength(0);await edit();await userEvent.clear(screen.getByLabelText('Correo laboral'));await userEvent.type(screen.getByLabelText('Correo laboral'),'cancel@example.test');await discard();await new Promise(resolve=>setTimeout(resolve,20));expect(commands).toHaveLength(0);expect(screen.getByText('mlopez@hotel.example')).toBeInTheDocument();}finally{outside.remove();}
});
it('does not finish an email during IME composition or key229',async()=>{
 mount();await screen.findByText('mlopez');await edit();const input=screen.getByLabelText('Correo laboral');await userEvent.clear(input);await userEvent.type(input,'composition@example.test');fireEvent.compositionStart(input);fireEvent.keyDown(input,{key:'Enter',isComposing:true});expect(commands).toHaveLength(0);fireEvent.compositionEnd(input);fireEvent.keyDown(input,{key:'Enter',keyCode:229});expect(commands).toHaveLength(0);fireEvent.keyDown(input,{key:'Enter'});await saved();expect(commands).toHaveLength(1);
});
it('role selection itself sends a single authorized PUT with complete current properties',async()=>{
 mount();await screen.findByText('mlopez');await edit('rol');const select=screen.getByLabelText('Rol Staff');expect(within(select).getAllByRole('option').map(option=>(option as HTMLOptionElement).value)).toEqual(['GERENCIA','RECEPCION','OPERACIONES','AUDITOR']);await userEvent.selectOptions(select,'AUDITOR');fireEvent.blur(select);await saved();expect(commands).toHaveLength(1);expect(commands[0].body).toEqual({roleCode:'AUDITOR',propertyIds:[p1,p2],expectedVersion:1});
});
it('multiple checkbox selections and internal Tab do not write; leaving the entire group sends one full replacement',async()=>{
 mount();await screen.findByText('mlopez');await edit('propiedades');await userEvent.click(screen.getByLabelText('Hotel 1'));await userEvent.click(screen.getByLabelText('Hotel 2'));await userEvent.click(screen.getByLabelText('Hotel 1'));expect(commands).toHaveLength(0);
 screen.getByLabelText('Hotel 1').focus();await userEvent.tab();expect(screen.getByLabelText('Hotel 2')).toHaveFocus();expect(commands).toHaveLength(0);
 const outside=document.createElement('button');outside.textContent='Fuera';document.body.append(outside);
 try{await userEvent.click(outside);await saved();expect(commands).toHaveLength(1);expect(commands[0].body).toEqual({roleCode:'RECEPCION',propertyIds:[p1],expectedVersion:1});expect(outside).toHaveFocus();}finally{outside.remove();}
});
it('Escape discards all property selections, while plain Enter on a checkbox does not commit',async()=>{
 mount();await screen.findByText('mlopez');await edit('propiedades');await userEvent.click(screen.getByLabelText('Hotel 2'));fireEvent.keyDown(screen.getByLabelText('Hotel 1'),{key:'Enter'});expect(commands).toHaveLength(0);await discard();expect(screen.queryByRole('group',{name:'Propiedades autorizadas'})).not.toBeInTheDocument();expect(commands).toHaveLength(0);await edit('propiedades');expect(screen.getByLabelText('Hotel 1')).toBeChecked();expect(screen.getByLabelText('Hotel 2')).toBeChecked();await discard();
});
it('Ctrl+Enter commits multi-selection exactly once even when blur also fires',async()=>{
 mount();await screen.findByText('mlopez');await edit('propiedades');await userEvent.click(screen.getByLabelText('Hotel 2'));const checkbox=screen.getByLabelText('Hotel 1');fireEvent.keyDown(checkbox,{key:'Enter',ctrlKey:true});fireEvent.blur(checkbox);await saved();expect(commands).toHaveLength(1);
});
it('after409 and explicit GET, passive blur does not resubmit a retained draft; conscious Enter does',async()=>{
 mockServer.use(http.patch(`*/api/staff/admin/users/${id}`,async args=>{if(commands.length===0){await capture('PATCH')(args);record={...record,workEmail:'concurrent@example.test',version:2};return reply(409,'STAFF_VERSION_CONFLICT');}return command(args);}));
 mount();await screen.findByText('mlopez');await edit();await userEvent.clear(screen.getByLabelText('Correo laboral'));await userEvent.type(screen.getByLabelText('Correo laboral'),'review@example.test');await apply();await screen.findByText(/La información cambió/);await userEvent.click(screen.getByRole('button',{name:'Actualizar usuario'}));await recovered();
 const outside=document.createElement('button');outside.textContent='Fuera';document.body.append(outside);
 try{await userEvent.click(outside);await new Promise(resolve=>setTimeout(resolve,25));expect(commands).toHaveLength(1);expect(screen.getByLabelText('Correo laboral')).toHaveValue('review@example.test');await userEvent.click(screen.getByLabelText('Correo laboral'));await apply();await saved();expect(commands).toHaveLength(2);expect(commands[1].body.expectedVersion).toBe(2);}finally{outside.remove();}
});
it('503 blocks Escape, blur and repeated Enter until explicit state verification',async()=>{
 mockServer.use(http.patch(`*/api/staff/admin/users/${id}`,async args=>{await capture('PATCH')(args);return reply(503,'STAFF_WRITE_UNAVAILABLE');}));mount();await screen.findByText('mlopez');await edit();await userEvent.clear(screen.getByLabelText('Correo laboral'));await userEvent.type(screen.getByLabelText('Correo laboral'),'uncertain@example.test');await apply();await screen.findByText(/No se pudo confirmar/);await discard();await apply();fireEvent.blur(screen.getByLabelText('Correo laboral'));await new Promise(resolve=>setTimeout(resolve,20));expect(screen.getByLabelText('Correo laboral')).toBeDisabled();expect(commands).toHaveLength(1);await userEvent.click(screen.getByRole('button',{name:'Actualizar usuario'}));await recovered();expect(commands).toHaveLength(1);
});
it('focusing PropertySwitcher does not autosave before its discard guard',async()=>{
 mount();await screen.findByText('mlopez');await edit();await userEvent.clear(screen.getByLabelText('Correo laboral'));await userEvent.type(screen.getByLabelText('Correo laboral'),'scope@example.test');const select=document.createElement('select');select.id='staff-property';document.body.append(select);
 try{await userEvent.click(select);const proceed=vi.fn();act(()=>guard?.(proceed));await screen.findByRole('dialog');expect(commands).toHaveLength(0);await userEvent.click(screen.getByRole('button',{name:'Volver'}));expect(proceed).not.toHaveBeenCalled();expect(screen.getByLabelText('Correo laboral')).toHaveValue('scope@example.test');}finally{select.remove();}
});

it('tab/window blur and visibility changes neither save nor cancel; a later in-page blur still commits',async()=>{
 const view=mount();await screen.findByText('mlopez');await edit();const input=screen.getByLabelText('Correo laboral');await userEvent.clear(input);await userEvent.type(input,'tab@example.test');
 const visibility=vi.spyOn(document,'visibilityState','get');visibility.mockReturnValue('hidden');act(()=>{window.dispatchEvent(new Event('blur'));document.dispatchEvent(new Event('visibilitychange'));});fireEvent.blur(input,{relatedTarget:null});await new Promise(resolve=>setTimeout(resolve,20));expect(commands).toHaveLength(0);expect(input).toHaveValue('tab@example.test');
 visibility.mockReturnValue('visible');act(()=>{document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('focus'));});await act(async()=>{await view.client.refetchQueries({queryKey:['staff-admin']});});expect(screen.getByLabelText('Correo laboral')).toBe(input);expect(input).toHaveValue('tab@example.test');expect(commands).toHaveLength(0);
 const outside=document.createElement('button');outside.textContent='Dentro de la página';document.body.append(outside);
 try{await userEvent.click(input);await userEvent.click(outside);await saved();expect(commands).toEqual([{method:'PATCH',body:{workEmail:'tab@example.test',expectedVersion:1},url:expect.any(URL)}]);}finally{outside.remove();visibility.mockRestore();}
});
it('background roles/list refetch keeps the same input and draft even while loading',async()=>{
 const view=mount();await screen.findByText('mlopez');await edit();const input=screen.getByLabelText('Correo laboral');await userEvent.clear(input);await userEvent.type(input,'held@example.test');let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
 mockServer.use(http.get('*/api/staff/admin/roles',async()=>{await gate;return HttpResponse.json({organizationId:org,items:codes.map(code=>({code,name:code}))});}));act(()=>{void view.client.invalidateQueries({queryKey:['staff-admin']});});await waitFor(()=>expect(screen.getByText('Actualizando…')).toBeInTheDocument());expect(screen.getByLabelText('Correo laboral')).toBe(input);expect(input).toHaveValue('held@example.test');
 await act(async()=>release());await waitFor(()=>expect(view.client.isFetching({queryKey:['staff-admin']})).toBe(0));expect(screen.getByLabelText('Correo laboral')).toBe(input);expect(commands).toHaveLength(0);await apply();await saved();expect(commands[0].body.expectedVersion).toBe(1);
});
it('a concurrent read-version change blocks writes without replacing the original draft/version',async()=>{
 const view=mount();await screen.findByText('mlopez');await edit();const input=screen.getByLabelText('Correo laboral');await userEvent.clear(input);await userEvent.type(input,'original-draft@example.test');record={...record,workEmail:'external@example.test',version:2};await act(async()=>{await view.client.refetchQueries({queryKey:['staff-admin']});});await screen.findByText('La información cambió. Actualiza el usuario para revisar tu borrador.');expect(screen.getByLabelText('Correo laboral')).toBe(input);expect(input).toHaveValue('original-draft@example.test');await apply();expect(commands).toHaveLength(0);
 await userEvent.click(screen.getByRole('button',{name:'Actualizar usuario'}));await recovered();expect(screen.queryByText(/Valor vigente:/)).not.toBeInTheDocument();expect(input).toHaveValue('original-draft@example.test');await apply();await saved();expect(commands[0].body).toEqual({workEmail:'original-draft@example.test',expectedVersion:2});
});
it('a target removed from refreshed filters remains pinned for review if scoped detail still authorizes it',async()=>{
 const view=mount();await screen.findByText('mlopez');await edit('propiedades');await userEvent.click(screen.getByLabelText('Hotel 2'));record={...record,roleCode:'AUDITOR',version:2};mockServer.use(http.get('*/api/staff/admin/users',()=>HttpResponse.json({organizationId:org,scope:scope(),items:[],limit:50,nextCursor:null})));
 await act(async()=>{await view.client.refetchQueries({queryKey:['staff-admin']});});await screen.findByText('La información cambió. Actualiza el usuario para revisar tu borrador.');expect(screen.getByLabelText('Hotel 1')).toBeChecked();expect(screen.getByLabelText('Hotel 2')).not.toBeChecked();expect(screen.getByText(/El usuario en edición no figura/)).toBeInTheDocument();expect(commands).toHaveLength(0);
 await userEvent.click(screen.getByRole('button',{name:'Actualizar usuario'}));await recovered();await apply();await saved();expect(commands[0].body).toEqual({roleCode:'AUDITOR',propertyIds:[p1],expectedVersion:2});
});
it('return-focus scoped404 withdraws a now-inaccessible target instead of retaining sensitive draft data',async()=>{
 mount();await screen.findByText('mlopez');await edit();const input=screen.getByLabelText('Correo laboral');mockServer.use(http.get(`*/api/staff/admin/users/${id}`,()=>reply(404,'STAFF_USER_NOT_FOUND')),http.get('*/api/staff/admin/users',()=>HttpResponse.json({organizationId:org,scope:scope(),items:[],limit:50,nextCursor:null})));
 act(()=>window.dispatchEvent(new Event('focus')));await screen.findByText('El usuario ya no está disponible en este contexto.');expect(input.isConnected).toBe(false);expect(screen.queryByText('mlopez')).not.toBeInTheDocument();expect(commands).toHaveLength(0);
});
it('a query refresh after uncertain503 cannot adopt a version or unblock writes automatically',async()=>{
 const view=mount();mockServer.use(http.patch(`*/api/staff/admin/users/${id}`,async args=>{await capture('PATCH')(args);return reply(503,'STAFF_WRITE_UNAVAILABLE');}));await screen.findByText('mlopez');await edit();await userEvent.clear(screen.getByLabelText('Correo laboral'));await userEvent.type(screen.getByLabelText('Correo laboral'),'uncertain-tab@example.test');await apply();await screen.findByText(/No se pudo confirmar/);record={...record,version:2,workEmail:'uncertain-tab@example.test'};await act(async()=>{window.dispatchEvent(new Event('focus'));await view.client.refetchQueries({queryKey:['staff-admin']});});expect(screen.getByLabelText('Correo laboral')).toBeDisabled();await apply();expect(commands).toHaveLength(1);await userEvent.click(screen.getByRole('button',{name:'Actualizar usuario'}));await recovered();expect(commands).toHaveLength(1);
});
it('a temporary administrative refetch error preserves the draft without claiming updated data',async()=>{
 const view=mount();await screen.findByText('mlopez');await edit();const input=screen.getByLabelText('Correo laboral');await userEvent.clear(input);await userEvent.type(input,'kept-on-error@example.test');mockServer.use(http.get('*/api/staff/admin/users',()=>reply(503,'STAFF_READ_UNAVAILABLE')));
 await act(async()=>{await view.client.refetchQueries({predicate:query=>query.queryKey[7]==='users'});});await screen.findByText('No se pudo actualizar la consulta. Tu borrador se conserva.');expect(screen.getByLabelText('Correo laboral')).toBe(input);expect(input).toHaveValue('kept-on-error@example.test');expect(commands).toHaveLength(0);await discard();
});
it('programmatic/refetch defocus without in-page departure intent never submits a draft',async()=>{
 mount();await screen.findByText('mlopez');await edit();const input=screen.getByLabelText('Correo laboral');await userEvent.clear(input);await userEvent.type(input,'not-a-navigation@example.test');const focus=vi.spyOn(document,'hasFocus').mockReturnValue(true);
 try{act(()=>input.blur());await new Promise(resolve=>setTimeout(resolve,20));expect(commands).toHaveLength(0);expect(screen.getByLabelText('Correo laboral')).toBe(input);expect(input).toHaveValue('not-a-navigation@example.test');await userEvent.click(input);await apply();await saved();expect(commands).toHaveLength(1);}finally{focus.mockRestore();}
});
it('property selections survive a hidden tab and refetch; finalization sends the original version once',async()=>{
 const view=mount();await screen.findByText('mlopez');await edit('propiedades');await userEvent.click(screen.getByLabelText('Hotel 2'));const first=screen.getByLabelText('Hotel 1'),second=screen.getByLabelText('Hotel 2');const visibility=vi.spyOn(document,'visibilityState','get');
 try{visibility.mockReturnValue('hidden');act(()=>{window.dispatchEvent(new Event('blur'));document.dispatchEvent(new Event('visibilitychange'));});fireEvent.blur(second,{relatedTarget:null});await act(async()=>{await view.client.refetchQueries({queryKey:['staff-admin']});});expect(commands).toHaveLength(0);expect(screen.getByLabelText('Hotel 2')).toBe(second);expect(second).not.toBeChecked();
 visibility.mockReturnValue('visible');act(()=>{document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('focus'));});await waitFor(()=>expect(view.client.isFetching({queryKey:['staff-admin']})).toBe(0));expect(screen.getByLabelText('Hotel 1')).toBe(first);expect(first).toBeChecked();expect(second).not.toBeChecked();expect(commands).toHaveLength(0);await userEvent.click(first);await userEvent.click(first);await apply();await saved();expect(commands).toHaveLength(1);expect(commands[0].body).toEqual({roleCode:'RECEPCION',propertyIds:[p1],expectedVersion:1});}finally{visibility.mockRestore();}
});

it.each(['correo','rol','propiedades'])('explicit recovery keeps %s draft in place without permanent explanations or success banners',async group=>{
 const view=mount();await screen.findByText('mlopez');await edit(group);
 const control=screen.getByLabelText(group==='correo'?'Correo laboral':group==='rol'?'Rol Staff':'Hotel 2');
 if(group==='correo'){await userEvent.clear(control);await userEvent.type(control,'retained@example.test');}
 if(group==='propiedades')await userEvent.click(control);
 record={...record,workEmail:'external@example.test',roleCode:'AUDITOR',version:2};
 await act(async()=>{await view.client.refetchQueries({queryKey:['staff-admin']});});await screen.findByText(/La información cambió/);
 await userEvent.click(screen.getByRole('button',{name:'Actualizar usuario'}));await recovered();
 expect(screen.getByLabelText(group==='correo'?'Correo laboral':group==='rol'?'Rol Staff':'Hotel 2')).toBe(control);
 if(group==='correo')expect(control).toHaveValue('retained@example.test');
 if(group==='rol')expect(within(control).getByRole('option',{selected:true})).toHaveTextContent('RECEPCION');
 if(group==='propiedades')expect(control).not.toBeChecked();
 expect(control).toHaveFocus();expect(screen.getByRole('form').querySelectorAll('p')).toHaveLength(0);
 expect(screen.queryByText(/Estado vigente comprobado|Valor vigente:|Borrador conservado:|se aplica automáticamente|Enter o salir|Al salir se aplican/)).not.toBeInTheDocument();
 for(const element of screen.getByRole('form').querySelectorAll('[aria-describedby]'))for(const id of element.getAttribute('aria-describedby')!.split(' '))expect(document.getElementById(id)).not.toBeNull();
 expect(screen.getAllByRole('columnheader').map(header=>header.textContent)).toEqual(['Usuario','Acceso','Asignación']);
 expect(commands).toHaveLength(0);await discard();
});
it('recovery restores the last property checkbox rather than moving focus to the first one',async()=>{
 const view=mount();await screen.findByText('mlopez');await edit('propiedades');const second=screen.getByLabelText('Hotel 2');await userEvent.click(second);
 record={...record,version:2};await act(async()=>{await view.client.refetchQueries({queryKey:['staff-admin']});});await screen.findByText(/La información cambió/);
 await userEvent.click(screen.getByRole('button',{name:'Actualizar usuario'}));await recovered();expect(second).toHaveFocus();expect(second).not.toBeChecked();expect(commands).toHaveLength(0);
 const outside=document.createElement('button');outside.textContent='Fuera';document.body.append(outside);
 try{await userEvent.click(outside);await new Promise(resolve=>setTimeout(resolve,20));expect(commands).toHaveLength(0);await userEvent.click(second);await userEvent.click(second);await apply();await saved();expect(commands[0].body).toEqual({roleCode:'RECEPCION',propertyIds:[p1],expectedVersion:2});}finally{outside.remove();}
});
it('slow recovery does not steal focus back when the user moves elsewhere inside the page',async()=>{
 mount();await screen.findByText('mlopez');await edit();const input=screen.getByLabelText('Correo laboral');await userEvent.clear(input);await userEvent.type(input,'retained@example.test');
 mockServer.use(http.patch(`*/api/staff/admin/users/${id}`,async args=>{await capture('PATCH')(args);return reply(409,'STAFF_VERSION_CONFLICT');}));await apply();await screen.findByText(/La información cambió/);
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});mockServer.use(http.get(`*/api/staff/admin/users/${id}`,async()=>{await gate;return detail();}));
 await userEvent.click(screen.getByRole('button',{name:'Actualizar usuario'}));const outside=document.createElement('button');outside.textContent='Otro control';document.body.append(outside);
 try{await userEvent.click(outside);await act(async()=>release());await recovered();expect(outside).toHaveFocus();expect(screen.getByLabelText('Correo laboral')).toBe(input);expect(input).toHaveValue('retained@example.test');expect(commands).toHaveLength(1);expect(screen.getByRole('form').querySelectorAll('p')).toHaveLength(0);}finally{outside.remove();}
});

it('a recovered role draft supports explicit keyboard confirmation with the latest counterpart and version',async()=>{
 const view=mount();await screen.findByText('mlopez');await edit('rol');record={...record,roleCode:'AUDITOR',propertyIds:[p2],version:2};
 await act(async()=>{await view.client.refetchQueries({queryKey:['staff-admin']});});await screen.findByText(/La información cambió/);await userEvent.click(screen.getByRole('button',{name:'Actualizar usuario'}));await recovered();
 expect(within(screen.getByLabelText('Rol Staff')).getByRole('option',{selected:true})).toHaveTextContent('RECEPCION');expect(commands).toHaveLength(0);await apply();await saved();expect(commands[0].body).toEqual({roleCode:'RECEPCION',propertyIds:[p2],expectedVersion:2});
});

it.each(['correo','rol','propiedades'])('click-to-edit regression: %s opens even with residual page text selection',async group=>{
 mount();await screen.findByText('mlopez');const selection=window.getSelection()!;selection.selectAllChildren(screen.getByText('mlopez'));
 try{await edit(group);expect(screen.getByRole('form')).toHaveAccessibleName(`Editar ${group} de mlopez`);expect(commands).toHaveLength(0);await discard();}finally{selection.removeAllRanges();}
});
