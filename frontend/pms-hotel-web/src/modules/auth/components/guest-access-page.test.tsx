import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/data/mocks/server';
import { GuestAccessPage } from './guest-access-page';
import { GuestSessionProvider } from './guest-session-provider';
import { rememberGuestCheckoutReturn } from '../model/guest-checkout-context';
const clients: QueryClient[] = [];
const navigation = { replace: vi.fn(), push: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), bfcacheId: 'unified-login' };
const password = 'SyntheticPassword2026!';
const checkout = '/reserva/checkout?checkIn=2026-11-01&checkOut=2026-11-03&adults=2&roomsCount=1';
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false');
  mockServer.use(http.get('*/api/auth/guest/session', () => new HttpResponse(null, { status: 401 })),
    http.get('*/api/auth/staff/session', () => new HttpResponse(null, { status: 401 })),
    http.post('*/api/auth/staff/refresh', () => new HttpResponse(null, { status: 401 })));
});
afterEach(() => { cleanup(); clients.splice(0).forEach(c => c.clear()); vi.unstubAllEnvs(); vi.clearAllMocks(); sessionStorage.clear(); localStorage.clear(); });
async function setup(returnTo?: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }); clients.push(client);
  render(<AppRouterContext.Provider value={navigation}><QueryClientProvider client={client}><GuestSessionProvider><GuestAccessPage returnTo={returnTo} /></GuestSessionProvider></QueryClientProvider></AppRouterContext.Provider>);
  await screen.findByRole('heading', { name: 'Accede a tu cuenta' });
  return userEvent.setup();
}
function submit() {
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: ' Person@Example.test ' } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: password } });
  fireEvent.submit(screen.getByLabelText('Correo electrónico').closest('form')!);
}
describe('Canonical universal login', () => {
  it('prevents normal typing of a 51st character into either login input', async () => {
    const user = await setup();
    await user.type(screen.getByLabelText('Correo electrónico'), 'x'.repeat(51));
    await user.type(screen.getByLabelText('Contraseña'), 'x'.repeat(51));
    expect(screen.getByLabelText('Correo electrónico')).toHaveValue('x'.repeat(50));
    expect(screen.getByLabelText('Contraseña')).toHaveValue('x'.repeat(50));
  });
  it.each([
    {email:'a'.repeat(38)+'@example.test',password:'x'},
    {email:'valid@example.test',password:'x'.repeat(51)},
    {email:'bad-email',password:'x'},
  ])('rejects programmatic invalid input case %# without BFF request', async input => {
    const request = vi.fn(() => HttpResponse.json({authenticated:true,context:'STAFF'},{status:201}));
    mockServer.use(http.post('*/api/auth/login',request));
    await setup();
    fireEvent.change(screen.getByLabelText('Correo electrónico'),{target:{value:input.email}});
    fireEvent.change(screen.getByLabelText('Contraseña'),{target:{value:input.password}});
    fireEvent.submit(screen.getByLabelText('Correo electrónico').closest('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('Correo electrónico o contraseña incorrectos.');
    expect(request).not.toHaveBeenCalled();
  });
  it.each(['true','false'])('renders the same single form with mock flag %s', async mock => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API',mock); await setup();
    expect(screen.getAllByLabelText('Correo electrónico')).toHaveLength(1);
    expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute('type','email');
    expect(screen.getByLabelText('Correo electrónico')).toBeRequired();
    expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute('maxlength','50');
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type','password');
    expect(screen.getByLabelText('Contraseña')).toBeRequired();
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('maxlength','50');
    expect(screen.getByRole('button',{name:'Iniciar sesión'})).toBeInTheDocument();
    expect(screen.getByRole('link',{name:'Continuar con Google'})).toHaveAttribute('href','/api/auth/guest/google');
    expect(screen.getByRole('link',{name:'Continuar como invitado'})).toHaveAttribute('href','/');
    expect(screen.queryByLabelText('Usuario')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.queryByText('Crear cuenta')).not.toBeInTheDocument();
    expect(screen.queryByText('¿Cómo deseas continuar?')).not.toBeInTheDocument();
  });
  it.each(['STAFF','GUEST'])('submits only email/password and redirects %s',async context => {
    const bodies: unknown[]=[];
    mockServer.use(http.post('*/api/auth/login',async ({request}) => { bodies.push(await request.json());return HttpResponse.json({authenticated:true,context},{status:201}); }));
    await setup();submit(); await waitFor(()=>expect(navigation.replace).toHaveBeenCalledWith(context==='STAFF'?'/dashboard':'/cuenta'));
    expect(bodies).toEqual([{email:'person@example.test',password}]);
    expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument();
    expect(sessionStorage.length).toBe(0);expect(localStorage.length).toBe(0);
  });
  it('sends a password with spaces unchanged and applies no complexity rules at login', async () => {
    const received: unknown[] = [];
    mockServer.use(http.post('*/api/auth/login', async ({request}) => {
      received.push(await request.json());
      return HttpResponse.json({authenticated:true,context:'STAFF'},{status:201});
    }));
    await setup();
    fireEvent.change(screen.getByLabelText('Correo electrónico'), {target:{value:'staff@example.test'}});
    fireEvent.change(screen.getByLabelText('Contraseña'), {target:{value:' a '}});
    fireEvent.submit(screen.getByLabelText('Correo electrónico').closest('form')!);
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/dashboard'));
    expect(received).toEqual([{email:'staff@example.test',password:' a '}]);
  });

  it('does not select either valid context until the user chooses and revalidates credentials',async()=>{
    const requests: unknown[]=[];
    mockServer.use(http.post('*/api/auth/login',async({request})=>{
      const body=await request.json() as {context?: string};requests.push(body);
      return body.context?HttpResponse.json({authenticated:true,context:body.context},{status:201}):HttpResponse.json({authenticated:false,contexts:['STAFF','GUEST']});
    }));
    const user=await setup();submit();await screen.findByText('¿Cómo deseas continuar?');
    expect(navigation.replace).not.toHaveBeenCalled();expect(sessionStorage.length).toBe(0);
    await user.click(screen.getByRole('button',{name:'Huésped'}));await waitFor(()=>expect(navigation.replace).toHaveBeenCalledWith('/cuenta'));
    expect(requests).toEqual([{email:'person@example.test',password},{email:'person@example.test',password,context:'GUEST'}]);
  });
  it('discards the context selector when credentials change',async()=>{
    mockServer.use(http.post('*/api/auth/login',()=>HttpResponse.json({authenticated:false,contexts:['STAFF','GUEST']})));
    await setup();submit();await screen.findByText('¿Cómo deseas continuar?');
    fireEvent.change(screen.getByLabelText('Contraseña'),{target:{value:'changed'}});
    expect(screen.queryByText('¿Cómo deseas continuar?')).not.toBeInTheDocument();
  });
  it.each([400,401])('shows a generic error without revealing identities for %s',async status=>{
    mockServer.use(http.post('*/api/auth/login',()=>HttpResponse.json({error:'staff account found'},{status})));
    await setup();submit();expect(await screen.findByRole('alert')).toHaveTextContent('Correo electrónico o contraseña incorrectos.');
    expect(screen.getByLabelText('Contraseña')).toHaveValue('');expect(navigation.replace).not.toHaveBeenCalled();
    expect(screen.queryByText('¿Cómo deseas continuar?')).not.toBeInTheDocument();
  });
  it.each(['503','network'])('shows backend unavailable on %s without redirect',async failure=>{
    mockServer.use(http.post('*/api/auth/login',()=>failure==='503'?new HttpResponse(null,{status:503}):HttpResponse.error()));
    await setup();submit();expect(await screen.findByRole('alert')).toHaveTextContent('El acceso no está disponible');expect(navigation.replace).not.toHaveBeenCalled();
  });
  it('disables fields while submitting and blocks duplicate requests',async()=>{
    let finish!:()=>void;const calls=vi.fn();
    mockServer.use(http.post('*/api/auth/login',async()=>{calls();await new Promise<void>(r=>{finish=r;});return HttpResponse.json({authenticated:true,context:'GUEST'},{status:201});}));
    await setup();submit();await waitFor(()=>expect(finish).toBeDefined());
    expect(screen.getByText('Verificando acceso…')).toHaveAttribute('role','status');expect(screen.getByLabelText('Correo electrónico')).toBeDisabled();
    fireEvent.submit(screen.getByLabelText('Correo electrónico').closest('form')!);expect(calls).toHaveBeenCalledTimes(1);finish();
    await waitFor(()=>expect(navigation.replace).toHaveBeenCalledWith('/cuenta'));
  });
  it.each([checkout,'/cuenta/reservas/vincular','/mis-reservas'])('keeps the allowed Guest return %s',async returnTo=>{
    mockServer.use(http.post('*/api/auth/login',()=>HttpResponse.json({authenticated:true,context:'GUEST'},{status:201})));
    await setup(returnTo);submit();await waitFor(()=>expect(navigation.replace).toHaveBeenCalledWith(returnTo));
  });
  it.each(['https://evil.test','//evil.test','/dashboard','/reserva/checkout?x=1\\evil'])('rejects unsafe return %s',async returnTo=>{
    mockServer.use(http.post('*/api/auth/login',()=>HttpResponse.json({authenticated:true,context:'GUEST'},{status:201})));
    await setup(returnTo);
    expect(screen.getByRole('link',{name:'Continuar como invitado'})).toHaveAttribute('href','/');
    submit();await waitFor(()=>expect(navigation.replace).toHaveBeenCalledWith('/cuenta'));
  });
  it('preserves the cart and search state for the anonymous journey without calling login',async()=>{
    const calls=vi.fn();mockServer.use(http.post('*/api/auth/login',()=>{calls();return HttpResponse.json({});}));
    sessionStorage.setItem('pms:public-cart:v1:real','synthetic-cart');
    await setup(checkout);expect(screen.getByRole('link',{name:'Continuar como invitado'})).toHaveAttribute('href',checkout);
    expect(sessionStorage.getItem('pms:public-cart:v1:real')).toBe('synthetic-cart');expect(calls).not.toHaveBeenCalled();
  });
  it('keeps Google in the Guest BFF and stores only the safe checkout return',async()=>{
    await setup(checkout+'&email=private@example.test&password=must-not-store');
    expect(screen.getByRole('link',{name:'Continuar con Google'})).toHaveAttribute('href','/api/auth/guest/google');
    fireEvent.click(screen.getByRole('link',{name:'Continuar con Google'}));
    expect(sessionStorage.getItem('pms:guest-checkout-return')).toBe(checkout);expect(localStorage.length).toBe(0);
  });
  it('redirects once to the stored checkout after the real Guest session hydrates',async()=>{
    let authenticated=false;
    mockServer.use(http.get('*/api/auth/guest/session',()=>authenticated
      ? HttpResponse.json({guestAccountId:'own',sessionId:'own-session',email:'own@example.test',context:'GUEST'})
      : new HttpResponse(null,{status:401})),
      http.post('*/api/auth/login',()=>{authenticated=true;return HttpResponse.json({authenticated:true,context:'GUEST'},{status:201});}));
    rememberGuestCheckoutReturn(checkout);
    await setup();submit();
    await waitFor(()=>expect(navigation.replace).toHaveBeenCalledExactlyOnceWith(checkout));
    expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument();
    expect(sessionStorage.length).toBe(0);
  });
  it('restores the permitted OAuth return once for an existing Guest session',async()=>{
    rememberGuestCheckoutReturn(checkout);
    mockServer.use(http.get('*/api/auth/guest/session',()=>HttpResponse.json({guestAccountId:'own',sessionId:'own-session',email:'own@example.test',context:'GUEST'})));
    const client=new QueryClient();clients.push(client);
    render(<AppRouterContext.Provider value={navigation}><QueryClientProvider client={client}><GuestSessionProvider><GuestAccessPage /></GuestSessionProvider></QueryClientProvider></AppRouterContext.Provider>);
    await waitFor(()=>expect(navigation.replace).toHaveBeenCalledWith(checkout));expect(sessionStorage.length).toBe(0);
  });
  it('shows and hides the password without storing it',async()=>{
    const user=await setup();fireEvent.change(screen.getByLabelText('Contraseña'),{target:{value:password}});
    await user.click(screen.getByRole('button',{name:'Mostrar contraseña'}));expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type','text');
    await user.click(screen.getByRole('button',{name:'Ocultar contraseña'}));expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type','password');
    expect(localStorage.length).toBe(0);expect(sessionStorage.length).toBe(0);
  });
});
