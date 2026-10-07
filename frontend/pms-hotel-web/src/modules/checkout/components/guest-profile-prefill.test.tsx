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
const clients: QueryClient[] = [];
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false'); vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://unrelated.invalid');
  mockServer.use(http.get('*/api/auth/guest/session', () => HttpResponse.json(session)), http.get('*/api/auth/guest/account/summary', () => HttpResponse.json(summary)));
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
describe('Checkout Guest hydration through the Account source', () => {
  it('does not invent Google names when the real summary only provides email and no profiles', async () => {
    mockServer.use(http.get('*/api/auth/guest/account/summary', () => HttpResponse.json({ ...summary, profiles: [] })));
    mount(); await waitFor(() => expect(screen.getByLabelText('email')).toHaveValue(session.email));
    expect(screen.getByLabelText('firstName')).toHaveValue(''); expect(screen.getByLabelText('lastName')).toHaveValue('');
    expect(screen.getByText('Completamos tu correo. Ingresa tu nombre, apellidos y los datos restantes.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('never overwrites either manual name, including a name cleared before the summary arrives', async () => {
    mockServer.use(http.get('*/api/auth/guest/account/summary', async () => { await delay(150); return HttpResponse.json(summary); }));
    mount();
    fireEvent.change(screen.getByLabelText('firstName'), { target: { value: 'Manual' } });
    fireEvent.change(screen.getByLabelText('firstName'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('lastName'), { target: { value: 'Apellido manual' } });
    await waitFor(() => expect(screen.getByLabelText('email')).toHaveValue(session.email));
    expect(screen.getByLabelText('firstName')).toHaveValue(''); expect(screen.getByLabelText('lastName')).toHaveValue('Apellido manual');
  });
  it('reuses own-account BFF data after Account loads, fills available names/email and never calls provisional profile', async () => {
    const requests: Request[] = []; const provisional = vi.fn();
    mockServer.use(http.get('*/api/auth/guest/account/summary', ({ request }) => { requests.push(request); return HttpResponse.json(summary); }), http.get('*/profile/:id', () => { provisional(); return new HttpResponse(null, { status: 503 }); }));
    const view = mount(<AccountDashboardPage />); await screen.findByText('María Pérez · Idioma no indicado · Perfil activo');
    view.rerender(<Form />);
    await waitFor(() => expect(screen.getByLabelText('firstName')).toHaveValue('María'));
    expect(screen.getByLabelText('lastName')).toHaveValue('Pérez'); expect(screen.getByLabelText('email')).toHaveValue(session.email);
    expect(screen.getByLabelText('phone')).toHaveValue(''); expect(screen.getByLabelText('document')).toHaveValue('');
    fireEvent.change(screen.getByLabelText('firstName'),{target:{value:''}}); expect(screen.getByLabelText('firstName')).toHaveValue('');
    expect(screen.queryByText(/No pudimos cargar tu perfil/)).not.toBeInTheDocument(); expect(provisional).not.toHaveBeenCalled();
    expect(requests.length).toBeGreaterThan(0);
    requests.forEach(request => { expect(new URL(request.url).origin).toBe(window.location.origin); expect(request.headers.has('authorization')).toBe(false); });
  });
  it.each([{profiles:[]}, {profiles:[summary.profiles[0], { ...summary.profiles[0], profileId: 'second' }]}])('fills only email when no unique linked profile exists', async ({profiles}) => {
    mockServer.use(http.get('*/api/auth/guest/account/summary', () => HttpResponse.json({ ...summary, profiles })));
    mount(); await waitFor(() => expect(screen.getByLabelText('email')).toHaveValue(session.email));
    expect(screen.getByLabelText('firstName')).toHaveValue(''); expect(screen.getByLabelText('lastName')).toHaveValue('');
    expect(screen.queryByText(/No pudimos cargar tu perfil/)).not.toBeInTheDocument();
  });
  it('preserves manual fields and retries a real profile-source failure', async () => {
    mockServer.use(http.get('*/api/auth/guest/account/summary', () => new HttpResponse(null, { status: 503 })));
    mount(<Form initial={{ ...emptyGuest, firstName: 'Manual', email: 'manual@example.test' }} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Puedes completar tus datos manualmente');
    expect(screen.getByLabelText('firstName')).toHaveValue('Manual');
    mockServer.use(http.get('*/api/auth/guest/account/summary', () => HttpResponse.json(summary)));
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(screen.getByLabelText('lastName')).toHaveValue('Pérez'));
    expect(screen.getByLabelText('firstName')).toHaveValue('Manual'); expect(screen.getByLabelText('email')).toHaveValue('manual@example.test');
  });
});
