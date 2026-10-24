import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mockServer } from '@/data/mocks/server';
import { StaffAdminWorkspace } from './index';
import { validateStaffDraft, staffDraft, canEditStaff, staffStatusActions } from './model/staff-admin-edit';
import type { StaffAdminUser } from './model/staff-admin';
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
 record = { ...record, ...(body.status ? { status: body.status as StaffAdminUser['status'] } : body.workEmail ? { workEmail: body.workEmail as string } : { roleCode: body.roleCode as StaffAdminUser['roleCode'], propertyIds: body.propertyIds as string[] }), version: record.version + 1 };
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
async function recovered() { await waitFor(()=>expect(screen.queryByRole('button',{name:'Actualizar usuario'})).not.toBeInTheDocument()); }
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
  http.patch(`*/api/staff/admin/users/${id}/status`, command), http.patch(`*/api/staff/admin/users/${id}`, command), http.put(`*/api/staff/admin/users/${id}/membership`, command),
 );
});
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.unstubAllEnvs(); });

const options=()=>screen.getByRole('button',{name:'Opciones de estado de mlopez'});
async function choose(label='Suspender') { await userEvent.click(options());await userEvent.click(screen.getByRole('button',{name:label}));await screen.findByRole('dialog'); }
async function confirm(label='Suspender') { await userEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:label})); }
async function settled() { await waitFor(()=>expect(options()).toBeEnabled()); }
function pointer(target:Element,type:string,x:number,y:number,extra={}) { fireEvent(target,Object.assign(new Event(type,{bubbles:true,cancelable:true}),{pointerId:1,pointerType:'touch',isPrimary:true,button:0,buttons:type==='pointerup'?0:1,clientX:x,clientY:y,...extra})); }
function swipe(target:Element,from=250,to=80) { pointer(target,'pointerdown',from,50);pointer(target,'pointermove',to,55);pointer(target,'pointerup',to,55); }

it.each(['false','true'])('only confirms allowed status commands on real BFF namespace with mocks=%s',async flag=>{
 vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API',flag);mount();await screen.findByText('mlopez');expect(detailReads).toBe(0);await choose();expect(commands).toHaveLength(0);
 expect(screen.getByRole('dialog')).toHaveTextContent('actualmente no existe reactivación');expect(screen.getAllByRole('columnheader',{hidden:true}).map(el=>el.textContent)).toEqual(['Usuario','Acceso','Asignación']);
 await confirm();await settled();expect(record.status).toBe('SUSPENDED');expect(record.version).toBe(2);expect(commands).toHaveLength(1);expect(commands[0].url.pathname).toBe(`/api/staff/admin/users/${id}/status`);expect(commands[0].url.searchParams.get('scope')).toBe('ALL_PROPERTIES');expect(commands[0].body).toEqual({status:'SUSPENDED',expectedVersion:1});
 await userEvent.click(options());expect(screen.queryByRole('button',{name:'Suspender'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Reactivar'})).not.toBeInTheDocument();await userEvent.click(screen.getByRole('button',{name:'Deshabilitar'}));await screen.findByRole('dialog');expect(screen.getByRole('dialog')).toHaveTextContent('Se conservará el historial');await confirm('Deshabilitar');await waitFor(()=>expect(screen.queryByRole('button',{name:'Opciones de estado de mlopez'})).not.toBeInTheDocument());
 expect(record.status).toBe('DISABLED');expect(record.version).toBe(3);expect(commands[1].body).toEqual({status:'DISABLED',expectedVersion:2});expect(screen.queryByRole('button',{name:/Editar .* de mlopez/})).not.toBeInTheDocument();expect(within(screen.getByText('mlopez').closest('tr')!).getByText('Baja administrativa')).toBeInTheDocument();
});
it('ACTIVE can be disabled directly with PROPERTY query preserved',async()=>{
 mocks.scope.mockReturnValue({...mocks.scope(),scope:{kind:'PROPERTY',propertyIds:[p1]}});mount();await screen.findByText('mlopez');await choose('Deshabilitar');await confirm('Deshabilitar');await waitFor(()=>expect(record.status).toBe('DISABLED'));expect(commands[0].url.searchParams.get('propertyId')).toBe(p1);expect(commands[0].body).toEqual({status:'DISABLED',expectedVersion:1});
});
it('mouse reveal and cancelling confirmation never write, then inline email remains usable',async()=>{
 mount();await screen.findByText('mlopez');await choose();await userEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Volver'}));await settled();expect(commands).toHaveLength(0);expect(options()).toHaveFocus();await edit();await userEvent.clear(screen.getByLabelText('Correo laboral'));await userEvent.type(screen.getByLabelText('Correo laboral'),'after-cancel@example.test');await save();expect(commands[0].body).toEqual({workEmail:'after-cancel@example.test',expectedVersion:1});
});
it('keyboard reveal, Escape and explicit confirmation preserve focus and table semantics',async()=>{
 mount();await screen.findByText('mlopez');options().focus();await userEvent.keyboard('{Enter}');expect(options()).toHaveAttribute('aria-expanded','true');await userEvent.keyboard('{Escape}');expect(options()).toHaveAttribute('aria-expanded','false');expect(options()).toHaveFocus();await userEvent.keyboard(' ');expect(screen.getByRole('button',{name:'Suspender'})).toHaveFocus();await userEvent.keyboard('{Enter}');await screen.findByRole('dialog');await userEvent.keyboard('{Escape}');await settled();expect(options()).toHaveFocus();expect(commands).toHaveLength(0);
});
it.each(['ACTIVE','SUSPENDED'] as const)('swipe backdrop: %s actions live behind the three cells, outside Access, and confirmation escapes clipping', async status => {
 record={...record,status}; mount(); const row=(await screen.findByText('mlopez')).closest('tr')!;
 const access=row.cells[1]; expect(within(access).queryByRole('button',{name:'Deshabilitar'})).not.toBeInTheDocument();
 await userEvent.click(options());
 const choices=screen.getByRole('group',{name:'Acciones de estado de mlopez'});
 expect(access.contains(choices)).toBe(false);
 expect(choices.parentElement?.parentElement).toBe(row.cells[2]);
 expect(choices.parentElement).not.toHaveAttribute('inert');
 expect(row.cells).toHaveLength(3);
 expect(within(choices).getAllByRole('button')).toHaveLength(status==='ACTIVE'?2:1);
 for(const button of within(choices).getAllByRole('button')) {
  const icon=button.querySelector('svg')!;
  expect(icon).toHaveAttribute('data-icon',button.textContent==='Suspender'?'PauseCircle':'UserX');
  expect(icon).toHaveAttribute('aria-hidden','true');expect(icon).toHaveAttribute('focusable','false');
  expect(icon).toHaveAttribute('stroke','currentColor');expect(button.firstElementChild).toBe(icon);
  expect(button.lastElementChild?.tagName).toBe('SPAN');
  expect(button).toHaveAccessibleName(button.textContent!);
 }
 expect(within(choices).queryByRole('img')).not.toBeInTheDocument();
 expect(commands).toHaveLength(0);
 await userEvent.click(within(choices).getByRole('button',{name:'Deshabilitar'}));
 const dialog=await screen.findByRole('dialog'); expect(row.contains(dialog)).toBe(false);
 expect(dialog).toHaveTextContent('Actualmente no existe reactivación'); expect(commands).toHaveLength(0);
 await userEvent.click(within(dialog).getByRole('button',{name:'Volver'})); await settled();
 expect(commands).toHaveLength(0);expect(options()).toHaveFocus();
});
it('touch swipe reveals actions but never confirms, and the synthetic click cannot toggle details',async()=>{
 mount();const name=await screen.findByText('mlopez');const row=name.closest('tr')!;swipe(row);expect(screen.getByRole('group',{name:'Acciones de estado de mlopez'})).toBeInTheDocument();expect(commands).toHaveLength(0);expect(detailReads).toBe(0);fireEvent.click(row,{detail:1});expect(screen.getByRole('button',{name:'Expandir información de mlopez'})).toHaveAttribute('aria-expanded','false');swipe(row,80,250);expect(screen.queryByRole('group',{name:'Acciones de estado de mlopez'})).not.toBeInTheDocument();
});
it.each(['vertical','short','right-button','cancelled','secondary','control','selection'])('does not reveal or write for %s gesture',async kind=>{
 mount();const name=await screen.findByText('mlopez');const row=name.closest('tr')!;const target=kind==='control'?screen.getByRole('button',{name:'Opciones de estado de mlopez'}):row;
 const selection=kind==='selection'?vi.spyOn(window,'getSelection').mockReturnValue({toString:()=> 'selected'} as Selection):undefined;
 try{const extra=kind==='right-button'?{pointerType:'mouse',button:2}:kind==='secondary'?{isPrimary:false}:{};pointer(target,'pointerdown',200,50,extra);pointer(target,'pointermove',kind==='short'?185:kind==='vertical'?195:50,kind==='vertical'?150:55,extra);if(kind==='cancelled')pointer(target,'pointercancel',50,55,extra);pointer(target,'pointerup',50,55,extra);expect(screen.queryByRole('group',{name:'Acciones de estado de mlopez'})).not.toBeInTheDocument();expect(commands).toHaveLength(0);}finally{selection?.mockRestore();}
});
it('swiping does not disturb an inline draft or enable simultaneous operations',async()=>{
 mount();await screen.findByText('mlopez');await edit();const input=screen.getByLabelText('Correo laboral');await userEvent.type(input,'draft');swipe(input.closest('tr')!);expect(options()).toBeDisabled();expect(screen.queryByRole('group',{name:'Acciones de estado de mlopez'})).not.toBeInTheDocument();expect(input).toHaveFocus();expect(commands).toHaveLength(0);await discard();
});
it.each(['self','super','disabled','manager-super','missing-permission'])('prevents status action for %s',async kind=>{
 if(kind==='self')mocks.session.mockReturnValue({...mocks.session(),staffUserId:id});if(kind==='super'||kind==='manager-super')record={...record,roleCode:'SUPER_ADMIN'};if(kind==='disabled')record={...record,status:'DISABLED'};if(kind==='manager-super')mocks.session.mockReturnValue({...mocks.session(),roleId:'GERENCIA'});if(kind==='missing-permission')mocks.session.mockReturnValue({...mocks.session(),permissions:[]});mount();
 if(kind==='missing-permission'){await waitFor(()=>expect(mocks.replace).toHaveBeenCalled());expect(screen.queryByText('mlopez')).not.toBeInTheDocument();}else if(kind==='manager-super')await screen.findByRole('alert');else{await screen.findByText('mlopez');expect(screen.queryByRole('button',{name:'Opciones de estado de mlopez'})).not.toBeInTheDocument();}expect(commands).toHaveLength(0);
});
it('GERENCIA with effective permission may suspend an ordinary scoped Staff',async()=>{
 mocks.session.mockReturnValue({...mocks.session(),roleId:'GERENCIA'});mount();await screen.findByText('mlopez');await choose();await confirm();await settled();expect(record.status).toBe('SUSPENDED');
});
it('409 preserves intent, requires explicit GET and another confirmation using the new version',async()=>{
 mockServer.use(http.patch(`*/api/staff/admin/users/${id}/status`,async args=>{if(!commands.length){await capture('PATCH')(args);record={...record,version:2,roleCode:'AUDITOR'};return reply(409,'STAFF_VERSION_CONFLICT');}return command(args);}));mount();await screen.findByText('mlopez');await choose();await confirm();await screen.findByText(/La información cambió/);expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Editar correo de mlopez'})).toBeDisabled();expect(commands).toHaveLength(1);
 await userEvent.click(screen.getByRole('button',{name:'Actualizar usuario'}));await recovered();expect(commands).toHaveLength(1);await userEvent.click(screen.getByRole('button',{name:'Revisar suspensión'}));await screen.findByRole('dialog');await confirm();await settled();expect(commands).toHaveLength(2);expect(commands[1].body).toEqual({status:'SUSPENDED',expectedVersion:2});expect(record.roleCode).toBe('AUDITOR');
});
it.each(['503','network','bad-ack'])('uncertain %s blocks edits and cancellation until explicit read, without replay',async failure=>{
 mockServer.use(http.patch(`*/api/staff/admin/users/${id}/status`,async args=>{await capture('PATCH')(args);return failure==='503'?reply(503,'STAFF_WRITE_UNAVAILABLE'):failure==='network'?HttpResponse.error():HttpResponse.json({organizationId:org,staffUserId:id,version:99,changed:true});}));const view=mount();await screen.findByText('mlopez');await choose('Deshabilitar');await confirm('Deshabilitar');await screen.findByText(/No se pudo confirmar/);expect(screen.queryByRole('button',{name:'Cerrar'})).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Editar correo de mlopez'})).toBeDisabled();
 await act(async()=>{window.dispatchEvent(new Event('focus'));await view.client.refetchQueries({queryKey:['staff-admin']});});expect(commands).toHaveLength(1);expect(screen.queryByRole('button',{name:/Revisar/})).not.toBeInTheDocument();await userEvent.click(screen.getByRole('button',{name:'Actualizar usuario'}));await recovered();expect(commands).toHaveLength(1);expect(screen.getByRole('button',{name:'Revisar baja'})).toBeEnabled();expect(mocks.revalidate).not.toHaveBeenCalled();
});
it('a committed but lost status ack is reconciled without a second command',async()=>{
 mockServer.use(http.patch(`*/api/staff/admin/users/${id}/status`,async args=>{await command(args);return reply(503,'STAFF_WRITE_UNAVAILABLE');}));mount();await screen.findByText('mlopez');await choose('Deshabilitar');await confirm('Deshabilitar');await screen.findByText(/No se pudo confirmar/);await userEvent.click(screen.getByRole('button',{name:'Actualizar usuario'}));await recovered();expect(within(screen.getByText('mlopez').closest('tr')!).getByText('Baja administrativa')).toBeInTheDocument();expect(screen.queryByRole('button',{name:/Revisar/})).not.toBeInTheDocument();expect(commands).toHaveLength(1);await userEvent.click(screen.getByRole('button',{name:'Cerrar'}));expect(screen.queryByRole('button',{name:/Editar .* de mlopez/})).not.toBeInTheDocument();
});
it.each([400,401,403,404,409])('handles status HTTP%i without retry or fabricated success',async status=>{
 const code=status===400?'INVALID_REQUEST':status===401?'STAFF_SESSION_REQUIRED':status===403?'STAFF_ACCESS_DENIED':status===404?'STAFF_USER_NOT_FOUND':'STAFF_STATE_CONFLICT';mockServer.use(http.patch(`*/api/staff/admin/users/${id}/status`,async args=>{await capture('PATCH')(args);return reply(status,code);}));mount();await screen.findByText('mlopez');await choose();await confirm();await waitFor(()=>expect(commands).toHaveLength(1));if(status===401||status===403){await screen.findByText('Verificando tu acceso Staff…');expect(mocks.revalidate).toHaveBeenCalled();}else if(status===404)await screen.findByText('El usuario ya no está disponible en este contexto.');else await screen.findByText(status===409?'La cuenta no admite este cambio en su estado actual. Actualiza el usuario.':'La solicitud no es válida. Revisa los datos antes de guardar.');expect(record.status).toBe('ACTIVE');
});
it('external refetch while confirmation is open closes it and requires explicit review',async()=>{
 const view=mount();await screen.findByText('mlopez');await choose();record={...record,version:3};await act(async()=>{await view.client.refetchQueries({queryKey:['staff-admin']});});await screen.findByText(/La información cambió/);expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(commands).toHaveLength(0);await userEvent.click(screen.getByRole('button',{name:'Actualizar usuario'}));await recovered();expect(screen.queryByRole('dialog')).not.toBeInTheDocument();await userEvent.click(screen.getByRole('button',{name:'Revisar suspensión'}));await screen.findByRole('dialog');await confirm();await settled();expect(commands[0].body.expectedVersion).toBe(3);
});
it('fresh GET before confirmation prevents offering a transition that is no longer allowed',async()=>{
 mount();await screen.findByText('mlopez');record={...record,status:'SUSPENDED',version:2};await userEvent.click(options());await userEvent.click(screen.getByRole('button',{name:'Suspender'}));await screen.findByText('Esta cuenta no admite esa transición.');expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(commands).toHaveLength(0);
});
it('double confirmation cannot issue two writes and state waits for Backend acknowledgement',async()=>{
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});mockServer.use(http.patch(`*/api/staff/admin/users/${id}/status`,async args=>{await capture('PATCH')(args);await gate;record={...record,status:'SUSPENDED',version:2};return HttpResponse.json({organizationId:org,staffUserId:id,version:2,changed:true});}));mount();await screen.findByText('mlopez');await choose();const button=within(screen.getByRole('dialog')).getByRole('button',{name:'Suspender'});fireEvent.click(button);fireEvent.click(button);await waitFor(()=>expect(commands).toHaveLength(1));expect(record.status).toBe('ACTIVE');expect(within(screen.getByText('mlopez').closest('tr')!).getByText('Activo')).toBeInTheDocument();await act(async()=>release());await settled();expect(record.status).toBe('SUSPENDED');
});
it('domain status actions reject reactivation, SUPER_ADMIN and invalid transitions',()=>{
 const session=mocks.session(),draft=staffDraft(record);expect(staffStatusActions(record,session)).toEqual(['SUSPENDED','DISABLED']);expect(canEditStaff(record,session,'status')).toBe(true);expect(validateStaffDraft('status',{...draft,status:'SUSPENDED'},record,session,scope())).toBeNull();expect(validateStaffDraft('status',draft,record,session,scope())).not.toBeNull();expect(staffStatusActions({...record,status:'SUSPENDED'},session)).toEqual(['DISABLED']);expect(staffStatusActions({...record,status:'DISABLED'},session)).toEqual([]);expect(staffStatusActions({...record,roleCode:'SUPER_ADMIN'},session)).toEqual([]);
});

it('status uncertainty uses the same persistent lock as inline email after a scoped remount',async()=>{
 mockServer.use(http.patch(`*/api/staff/admin/users/${id}/status`,async args=>{await capture('PATCH')(args);return reply(503,'STAFF_WRITE_UNAVAILABLE');}));const view=mount();await screen.findByText('mlopez');await choose();await confirm();await screen.findByText(/No se pudo confirmar/);mocks.scope.mockReturnValue({...mocks.scope(),scope:{kind:'PROPERTY',propertyIds:[p1]}});view.refresh();await screen.findByText('mlopez');await userEvent.click(screen.getByRole('button',{name:'Editar correo de mlopez'}));await screen.findByText(/Hay un resultado pendiente/);expect(screen.getByLabelText('Correo laboral')).toBeDisabled();await apply();expect(commands).toHaveLength(1);
});
it('a status change removes the user from ACTIVE-filter results and reconciles the detail cache',async()=>{
 mockServer.use(http.get('*/api/staff/admin/users',({request})=>{const status=new URL(request.url).searchParams.get('status');return HttpResponse.json({organizationId:org,scope:scope(),items:!status||status===record.status?[record]:[],limit:50,nextCursor:null});}));const view=mount();const snapshots:unknown[]=[];view.client.getQueryCache().subscribe(event=>{if(event.type==='updated'&&event.action.type==='success'&&event.query.queryKey[7]==='detail')snapshots.push(event.query.state.data);});await screen.findByText('mlopez');await userEvent.selectOptions(screen.getByLabelText('Estado'),'ACTIVE');await waitFor(()=>expect(screen.getByRole('button',{name:'Opciones de estado de mlopez'})).toBeEnabled());await choose();await confirm();await screen.findByText('No existen coincidencias con estos filtros.');expect(screen.queryByText('mlopez')).not.toBeInTheDocument();expect(snapshots).toContainEqual(expect.objectContaining({status:'SUSPENDED',version:2}));expect(view.client.getQueryCache().findAll({predicate:q=>q.queryKey[7]==='detail'&&q.queryKey[8]===id}).every(q=>(q.state.data as StaffAdminUser | undefined)?.status!=='ACTIVE')).toBe(true);expect(commands).toHaveLength(1);
});

it('terminal completion restores keyboard focus to the row expansion after reconciliation finishes',async()=>{
 mount();await screen.findByText('mlopez');await choose('Deshabilitar');await confirm('Deshabilitar');await waitFor(()=>expect(screen.queryByRole('button',{name:'Opciones de estado de mlopez'})).not.toBeInTheDocument());await waitFor(()=>expect(screen.getByRole('button',{name:'Contraer información de mlopez'})).toHaveFocus());expect(commands).toHaveLength(1);
});
