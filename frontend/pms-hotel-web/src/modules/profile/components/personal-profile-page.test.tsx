import {act,render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import {http,HttpResponse} from 'msw';
import {mockServer} from '@/data/mocks/server';
import {refreshGuestSession} from '@/modules/auth';
import {PersonalProfilePage} from './personal-profile-page';
const session=vi.hoisted(()=>({account:{id:'own',email:'own@example.test'},status:'signed-in',retrySession:vi.fn()}));
vi.mock('@/modules/auth',()=>({useGuestSession:()=>session,refreshGuestSession:vi.fn(async()=>undefined)}));
const endpoint='*/api/auth/guest/account/profile';
const empty={guestAccountId:'own',email:'own@example.test',profile:null};
const profile={profileId:'personal',firstName:'Demo',lastName:'Guest',phone:null,country:null,preferredLanguage:null,bedType:null,roomVibe:null,floorPreference:null,version:1,updatedAt:'2026-10-28T12:00:00.123456Z'};
let client:QueryClient;
beforeEach(()=>{client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API','false');});
afterEach(()=>{cleanup();client.clear();vi.unstubAllEnvs();vi.clearAllMocks();});
function mount(){return render(<QueryClientProvider client={client}><PersonalProfilePage/></QueryClientProvider>);}
function change(label:string,value:string){fireEvent.change(screen.getByLabelText(label),{target:{value}});}
it('renders an empty editable personal form with a read-only login email and no automatic write',async()=>{
 const put=vi.fn();mockServer.use(http.get(endpoint,()=>HttpResponse.json(empty)),http.put(endpoint,()=>{put();return HttpResponse.json(empty);}));mount();
 expect(await screen.findByLabelText('Nombre *')).toHaveValue('');expect(screen.getByLabelText('Nombre *')).toBeRequired();expect(screen.getByLabelText('Apellidos *')).toBeRequired();expect(screen.getByLabelText('Correo de acceso')).toHaveAttribute('readonly');expect(screen.getByLabelText('País / región')).toHaveValue('');expect(screen.getByRole('button',{name:'Guardar cambios'})).toBeDisabled();expect(put).not.toHaveBeenCalled();
});
it('shows field errors and focuses the first invalid field without submitting',async()=>{
 mockServer.use(http.get(endpoint,()=>HttpResponse.json(empty)));mount();await screen.findByLabelText('Nombre *');change('Teléfono','bad');fireEvent.click(screen.getByRole('button',{name:'Guardar cambios'}));
 expect(screen.getByText('Escribe tu nombre (máximo 80 caracteres).')).toBeInTheDocument();expect(screen.getByLabelText('Nombre *')).toHaveFocus();expect(screen.getByLabelText('Teléfono')).toHaveAttribute('aria-invalid','true');
});
it('saves through same-origin Guest transport, cancels edits and keeps the account-scoped cache',async()=>{
 let body:Record<string,unknown>|undefined;
 mockServer.use(http.get(endpoint,()=>HttpResponse.json(empty)),http.put(endpoint,async({request})=>{expect(request.headers.has('authorization')).toBe(false);body=await request.json() as Record<string,unknown>;return HttpResponse.json({...empty,profile:{...profile,...body,profileId:'personal',version:1,updatedAt:profile.updatedAt}});}));
 mount();await screen.findByLabelText('Nombre *');change('Nombre *','Demo');change('Apellidos *','Guest');change('Teléfono','+502 5555 5555');fireEvent.click(screen.getByRole('button',{name:'Guardar cambios'}));
 await screen.findByText('Perfil guardado correctamente.');expect(body).not.toHaveProperty('email');expect(body).not.toHaveProperty('guestAccountId');expect(body).toHaveProperty('phone','+50255555555');expect(client.getQueryData(['guest','personal-profile','own'])).toHaveProperty('details.id','personal');
 change('Nombre *','Modified');fireEvent.click(screen.getByRole('button',{name:'Cancelar cambios'}));expect(screen.getByLabelText('Nombre *')).toHaveValue('Demo');
});
it('preserves a draft on conflict and requires explicit reload before overwriting',async()=>{
 let updated=false;mockServer.use(http.get(endpoint,()=>HttpResponse.json({...empty,profile:{...profile,firstName:updated?'Newer':'Demo'}})),http.put(endpoint,()=>{updated=true;return new HttpResponse(null,{status:409});}));
 mount();await screen.findByLabelText('Nombre *');change('Nombre *','Draft');fireEvent.click(screen.getByRole('button',{name:'Guardar cambios'}));await screen.findByRole('alert');expect(screen.getByLabelText('Nombre *')).toHaveValue('Draft');expect(screen.getByRole('button',{name:'Guardar cambios'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Descartar borrador y recargar perfil'}));await waitFor(()=>expect(screen.getByLabelText('Nombre *')).toHaveValue('Newer'));
});
it('keeps edits on a failed save and allows retry',async()=>{
 let fail=true;mockServer.use(http.get(endpoint,()=>HttpResponse.json({...empty,profile})),http.put(endpoint,()=>fail?new HttpResponse(null,{status:503}):HttpResponse.json({...empty,profile:{...profile,firstName:'Saved',version:2}})));
 mount();await screen.findByLabelText('Nombre *');change('Nombre *','Saved');fireEvent.click(screen.getByRole('button',{name:'Guardar cambios'}));await screen.findByRole('alert');expect(screen.getByLabelText('Nombre *')).toHaveValue('Saved');fail=false;fireEvent.click(screen.getByRole('button',{name:'Guardar cambios'}));await screen.findByText('Perfil guardado correctamente.');
});
it('does not repopulate Guest cache after logout while a save is in flight',async()=>{
 let release!:()=>void;const pending=new Promise<void>(resolve=>{release=resolve;});
 mockServer.use(http.get(endpoint,()=>HttpResponse.json({...empty,profile})),http.put(endpoint,async()=>{await pending;return HttpResponse.json({...empty,profile:{...profile,firstName:'Changed',version:2}});}));
 const view=mount();await screen.findByLabelText('Nombre *');change('Nombre *','Changed');fireEvent.click(screen.getByRole('button',{name:'Guardar cambios'}));await screen.findByText('Guardando tu perfil…');view.unmount();client.removeQueries({queryKey:['guest']});release();await waitFor(()=>expect(client.isMutating()).toBe(0));expect(client.getQueryData(['guest','personal-profile','own'])).toBeUndefined();
});

it('refreshes an expired Guest access token once before retrying the own profile',async()=>{
 let reads=0;mockServer.use(http.get(endpoint,()=>++reads===1?new HttpResponse(null,{status:401}):HttpResponse.json(empty)));mount();await screen.findByLabelText('Nombre *');expect(refreshGuestSession).toHaveBeenCalledTimes(1);expect(reads).toBe(2);expect(session.retrySession).not.toHaveBeenCalled();
});
it('delegates an expired Guest session to the session controller without using Staff auth',async()=>{
 mockServer.use(http.get(endpoint,()=>new HttpResponse(null,{status:401})));mount();await screen.findByRole('alert');expect(session.retrySession).toHaveBeenCalledTimes(1);expect(refreshGuestSession).toHaveBeenCalledTimes(1);expect(screen.queryByLabelText('Nombre *')).not.toBeInTheDocument();
});

it('keeps an unsaved draft mounted when a background read fails',async()=>{
 let offline=false;mockServer.use(http.get(endpoint,()=>offline?new HttpResponse(null,{status:503}):HttpResponse.json({...empty,profile})));mount();await screen.findByLabelText('Nombre *');change('Nombre *','Draft preserved');offline=true;
 await act(async()=>{await client.invalidateQueries({queryKey:['guest','personal-profile','own']});});await screen.findByRole('alert');expect(screen.getByLabelText('Nombre *')).toHaveValue('Draft preserved');expect(screen.getByRole('button',{name:'Guardar cambios'})).toBeEnabled();
});

it('does not replay a write after logout while the Guest refresh is pending',async()=>{
 let release!:()=>void;const pending=new Promise<void>(resolve=>{release=resolve;}),writes=vi.fn();
 vi.mocked(refreshGuestSession).mockImplementationOnce(()=>pending);
 mockServer.use(http.get(endpoint,()=>HttpResponse.json({...empty,profile})),http.put(endpoint,()=>{writes();return new HttpResponse(null,{status:401});}));
 const view=mount();await screen.findByLabelText('Nombre *');change('Nombre *','Changed');fireEvent.click(screen.getByRole('button',{name:'Guardar cambios'}));await waitFor(()=>expect(refreshGuestSession).toHaveBeenCalledTimes(1));view.unmount();client.removeQueries({queryKey:['guest']});release();await waitFor(()=>expect(client.isMutating()).toBe(0));expect(writes).toHaveBeenCalledTimes(1);expect(client.getQueryData(['guest','personal-profile','own'])).toBeUndefined();
});
