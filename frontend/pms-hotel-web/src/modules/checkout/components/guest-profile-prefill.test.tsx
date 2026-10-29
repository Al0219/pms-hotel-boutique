import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { delay, http, HttpResponse } from 'msw';
import { mockServer } from '@/data/mocks/server';
import { GuestSessionProvider } from '@/modules/auth';
import { AccountDashboardPage } from '@/modules/account';
import { emptyGuest, type GuestDetails, type GuestField } from '../domain/guest-details';
import { GuestProfilePrefill } from './guest-profile-prefill';

const session = { guestAccountId: 'guest-own', sessionId: 'guest-own-session', email: 'guest@example.test', context: 'GUEST' };
const summary = { guestAccountId: session.guestAccountId, email: session.email, active: true,
  profiles: [{ profileId: 'own-profile', firstName: 'María', lastName: 'Pérez', preferredLanguage: null, status: 'ACTIVE' }], linkedReservationsCount: 0, upcomingStay: null };
const personal={guestAccountId:session.guestAccountId,email:session.email,profile:{profileId:'personal',firstName:'María',lastName:'Pérez',phone:'+50255555555',country:'Guatemala',preferredLanguage:'es',bedType:null,roomVibe:null,floorPreference:null,version:1,updatedAt:'2026-10-28T12:00:00Z'}};
const clients: QueryClient[] = [];
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false'); vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://unrelated.invalid');
  mockServer.use(http.get('*/api/auth/guest/session', () => HttpResponse.json(session)), http.get('*/api/auth/guest/account/summary', () => HttpResponse.json(summary)),http.get('*/api/auth/guest/account/profile',()=>HttpResponse.json(personal)));
});
afterEach(() => { clients.splice(0).forEach(client => client.clear()); vi.unstubAllEnvs(); });
function Form({ initial = emptyGuest }: { initial?: GuestDetails }) {
  const [guest, setGuest] = useState(initial);
  const [edited, setEdited] = useState<ReadonlySet<GuestField>>(() => new Set());
  return <><GuestProfilePrefill guest={guest} editedFields={edited} onFill={patch => setGuest(previous => ({ ...previous, ...patch }))} />
    {(['firstName', 'lastName', 'email', 'phone', 'document'] as const).map(field => <input key={field} aria-label={field} value={guest[field]} onChange={event => { setEdited(previous => new Set(previous).add(field)); setGuest(previous => ({ ...previous, [field]: event.target.value })); }} />)}</>;
}
function mount(node = <Form />) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clients.push(client);
  return render(node, { wrapper: ({ children }) => <QueryClientProvider client={client}><GuestSessionProvider>{children}</GuestSessionProvider></QueryClientProvider> });
}

describe('Checkout Guest hydration through the explicit personal profile',()=>{
  it('fills only email when there is no designated personal profile',async()=>{
    mockServer.use(http.get('*/api/auth/guest/account/profile',()=>HttpResponse.json({...personal,profile:null})));mount();await waitFor(()=>expect(screen.getByLabelText('email')).toHaveValue(session.email));
    await screen.findByText('Completamos tu correo. Ingresa tu nombre, apellidos y los datos restantes.');expect(screen.getByLabelText('firstName')).toHaveValue('');expect(screen.getByLabelText('lastName')).toHaveValue('');expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('never overwrites manual values or a name deliberately cleared before the profile arrives',async()=>{
    mockServer.use(http.get('*/api/auth/guest/account/profile',async()=>{await delay(150);return HttpResponse.json(personal);}));mount();fireEvent.change(screen.getByLabelText('firstName'),{target:{value:'Manual'}});fireEvent.change(screen.getByLabelText('firstName'),{target:{value:''}});fireEvent.change(screen.getByLabelText('lastName'),{target:{value:'Apellido manual'}});
    await screen.findByText('Usamos los datos disponibles de tu cuenta. Completa los campos restantes.');expect(screen.getByLabelText('firstName')).toHaveValue('');expect(screen.getByLabelText('lastName')).toHaveValue('Apellido manual');
  });
  it('fills only designated personal names and contact, never documents or provisional transport',async()=>{
    const requests:Request[]=[],provisional=vi.fn();mockServer.use(http.get('*/api/auth/guest/account/profile',({request})=>{requests.push(request);return HttpResponse.json(personal);}),http.get('*/profile/:id',()=>{provisional();return new HttpResponse(null,{status:503});}));
    const view=mount(<AccountDashboardPage/>);await screen.findByRole('heading',{name:'Tu perfil personal'});view.rerender(<Form/>);await waitFor(()=>expect(screen.getByLabelText('firstName')).toHaveValue('María'));
    expect(screen.getByLabelText('lastName')).toHaveValue('Pérez');expect(screen.getByLabelText('email')).toHaveValue(session.email);expect(screen.getByLabelText('phone')).toHaveValue('55555555');expect(screen.getByLabelText('document')).toHaveValue('');expect(provisional).not.toHaveBeenCalled();
    expect(requests.length).toBeGreaterThan(0);requests.forEach(request=>{expect(new URL(request.url).origin).toBe(window.location.origin);expect(request.headers.has('authorization')).toBe(false);});
  });
  it('uses the designated profile even when summary contains N historical profiles',async()=>{
    mockServer.use(http.get('*/api/auth/guest/account/summary',()=>HttpResponse.json({...summary,profiles:[summary.profiles[0],{...summary.profiles[0],profileId:'second'}]})));mount();await waitFor(()=>expect(screen.getByLabelText('firstName')).toHaveValue('María'));
    expect(screen.getByLabelText('lastName')).toHaveValue('Pérez');
  });
  it('preserves manual fields and retries a personal profile read failure',async()=>{
    mockServer.use(http.get('*/api/auth/guest/account/profile',()=>new HttpResponse(null,{status:503})));mount(<Form initial={{...emptyGuest,firstName:'Manual',email:'manual@example.test'}}/>);await screen.findByRole('alert');expect(screen.getByLabelText('firstName')).toHaveValue('Manual');
    mockServer.use(http.get('*/api/auth/guest/account/profile',()=>HttpResponse.json(personal)));fireEvent.click(screen.getByRole('button',{name:'Reintentar'}));await waitFor(()=>expect(screen.getByLabelText('lastName')).toHaveValue('Pérez'));expect(screen.getByLabelText('email')).toHaveValue('manual@example.test');
  });
});
