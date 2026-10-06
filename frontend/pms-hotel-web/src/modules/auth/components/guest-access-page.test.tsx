import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { delay, http, HttpResponse } from 'msw';
import { mockServer } from '@/data/mocks/server';
import { AccountDashboardPage } from '@/modules/account';
import { GuestAccessPage } from './guest-access-page';
import { GuestSessionProvider, useGuestSession } from './guest-session-provider';
import { GuestAccountGate } from './guest-account-gate';

const navigation = { replace: vi.fn(), push: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), bfcacheId: 'guest-access-test' };
const endpoint = 'http://pms.test/__mock/guest-access';
const clients: QueryClient[] = [];
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.unstubAllEnvs(); vi.clearAllMocks(); });

function SessionObserver() {
  const { status } = useGuestSession();
  return <output aria-label="Guest session">{status}</output>;
}
function setup(returnTo?: string) {
  vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true');
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  function Harness({ page }: { page: 'access' | 'account' | 'profile' }) {
    return <AppRouterContext.Provider value={navigation}><QueryClientProvider client={client}><GuestSessionProvider>
      <SessionObserver />
      {page === 'access' ? <GuestAccessPage returnTo={returnTo} /> : <GuestAccountGate>{page === 'account' ? <AccountDashboardPage /> : <p>Perfil del huésped</p>}</GuestAccountGate>}
    </GuestSessionProvider></QueryClientProvider></AppRouterContext.Provider>;
  }
  const view = render(<Harness page="access" />);
  return { client, user: userEvent.setup(), navigate: (page: 'access' | 'account' | 'profile') => view.rerender(<Harness page={page} />) };
}
function fillEmail(email = 'demo@example.com') {
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'ExamplePass42!' } });
}
function submit() { fireEvent.submit(screen.getByLabelText('Correo electrónico').closest('form')!); }
function fillRegistration() {
  fireEvent.click(screen.getByRole('tab', { name: 'Crear cuenta' }));
  fillEmail('jose@example.com');
  fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'José Pérez' } });
  fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'ExamplePass42!' } });
  fireEvent.click(screen.getByRole('checkbox', { name: /Acepto los Términos/ }));
}

describe('Guest identity frontend', () => {
  it('explains guest bookings, accepts Google and redirects to linked reservations', async () => {
    const { user } = setup('/mis-reservas');
    expect(screen.getByText('¿Reservaste como invitado?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continuar como invitado' })).toHaveAttribute('href', '/habitaciones');
    await user.click(screen.getByRole('button', { name: 'Continuar con Google' }));
    expect(screen.getByRole('button', { name: 'Conectando…' })).toBeDisabled();
    expect(await screen.findByRole('link', { name: 'Ir a Mis reservas' })).toHaveAttribute('href', '/mis-reservas');
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/mis-reservas'), { timeout: 2000 });
  });

  it('retains one session across routes and clears Guest data without touching Staff', async () => {
    const { user, navigate, client } = setup();
    client.setQueryData(['staff', 'demo'], { active: true });
    fillEmail(); submit();
    expect(await screen.findByRole('button', { name: 'Procesando…' })).toBeDisabled();
    expect(screen.getByLabelText('Guest session')).toHaveTextContent('signed-out');
    expect(await screen.findByRole('heading', { name: 'Tu cuenta está lista' })).toBeInTheDocument();
    navigate('account');
    expect(await screen.findByRole('heading', { name: 'Mi cuenta' })).toBeInTheDocument();
    expect(screen.getByText(/Acceso por correo · demo@example.com/)).toBeInTheDocument();
    expect(screen.queryByText(/Google conectado/)).not.toBeInTheDocument();
    navigate('profile');
    expect(screen.getByText('Perfil del huésped')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(screen.queryByText('Perfil del huésped')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/acceso');
    expect(client.getQueriesData({ queryKey: ['guest'] })).toHaveLength(0);
    expect(client.getQueryData(['staff', 'demo'])).toEqual({ active: true });
    navigate('access');
    expect(screen.getByRole('heading', { name: 'Accede a tu cuenta' })).toBeInTheDocument();
  });

  it('keeps input after a recoverable error and never signs in on failure', async () => {
    setup(); fillEmail('error@example.com'); submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos completar el acceso');
    expect(screen.getByLabelText('Guest session')).toHaveTextContent('signed-out');
    expect(screen.getByLabelText('Correo electrónico')).toHaveValue('error@example.com');
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'retry@example.com' } });
    submit();
    expect(await screen.findByRole('heading', { name: 'Tu cuenta está lista' })).toBeInTheDocument();
  });

  it('reports offline without false success or redirect', async () => {
    setup(); fillEmail('offline@example.com'); submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Comprueba tu conexión');
    expect(screen.getByLabelText('Guest session')).toHaveTextContent('signed-out');
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it('supports Google through the existing session authority', async () => {
    const { user, navigate } = setup();
    await user.click(screen.getByRole('button', { name: 'Continuar con Google' }));
    await screen.findByRole('heading', { name: 'Tu cuenta está lista' });
    navigate('account');
    expect(await screen.findByText(/Google conectado · guest.google@example.com/)).toBeInTheDocument();
  });

  it('offers Google without Apple in both login and registration', async () => {
    const { user } = setup();
    expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Apple/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Crear cuenta' }));
    expect(screen.getByRole('button', { name: 'Registrarse con Google' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Apple/ })).not.toBeInTheDocument();
  });

  it('blocks duplicate submissions and never transports passwords or confirmation', async () => {
    const requests: unknown[] = [];
    mockServer.use(http.post(endpoint, async ({ request }) => {
      requests.push(await request.json()); await delay(100);
      return HttpResponse.json({ account_id: 'guest-demo-01', email: 'demo@example.com', external_identities: [] });
    }));
    const { client } = setup(); fillEmail(); submit(); submit();
    await screen.findByRole('heading', { name: 'Tu cuenta está lista' });
    expect(requests).toEqual([{ method: 'EMAIL', email: 'demo@example.com' }]);
    expect(JSON.stringify(client.getMutationCache().getAll().map(item => item.state.variables))).not.toContain('ExamplePass42!');
    expect(localStorage.length).toBe(0); expect(sessionStorage.length).toBe(0);
  });

  it('guards direct account access and offers a deterministic guest destination', () => {
    const { navigate } = setup();
    expect(screen.getByRole('link', { name: 'Continuar como invitado' })).toHaveAttribute('href', '/');
    navigate('account');
    expect(screen.queryByRole('heading', { name: 'Mi cuenta' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  it('rejects malformed account data without creating a session', async () => {
    mockServer.use(http.post(endpoint, () => HttpResponse.json({ account_id: ' ', email: null, external_identities: [] })));
    setup(); fillEmail(); submit();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByLabelText('Guest session')).toHaveTextContent('signed-out');
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it('validates on blur/submit, focuses first error, and revalidates while typing', () => {
    setup(); submit();
    const email = screen.getByLabelText('Correo electrónico');
    expect(email).toHaveFocus(); expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Ingresa un correo electrónico válido.')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('aria-invalid', 'true');
    fillEmail();
    expect(email).toHaveAttribute('aria-invalid', 'false');
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('aria-invalid', 'false');
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it('shows and hides passwords, supports keyboard tabs, and discards credentials on mode change', async () => {
    const { user } = setup(); fillEmail();
    await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password');
    screen.getByRole('tab', { name: 'Iniciar sesión' }).focus(); await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Crear cuenta' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Crear cuenta' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Contraseña')).toHaveValue('');
    expect(screen.getByLabelText('Correo electrónico')).toHaveValue('demo@example.com');
    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'Iniciar sesión' })).toHaveFocus();
  });

  it('requires matching passwords and explicit consent while marketing stays optional', () => {
    setup(); fireEvent.click(screen.getByRole('tab', { name: 'Crear cuenta' }));
    expect(screen.getByRole('checkbox', { name: /Acepto los Términos/ })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Deseo recibir ofertas/ })).not.toBeChecked();
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'short' } });
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuetext', 'Débil');
    submit(); expect(screen.getByLabelText('Nombre completo')).toHaveFocus();
    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Ana' } });
    expect(screen.getByText('Ingresa tu nombre y apellido.')).toBeInTheDocument();
    expect(screen.getByText(/Usa al menos 8 caracteres para/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'ExamplePass42!' } });
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuetext', 'Fuerte');
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'DifferentPass42!' } });
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument();
    expect(screen.getByText(/Acepta los términos/)).toBeInTheDocument();
    expect(screen.getByLabelText('Guest session')).toHaveTextContent('signed-out');
  });

  it('previews registration with a separate profile and no fabricated reservations', async () => {
    const { navigate } = setup(); fillRegistration(); submit();
    expect(await screen.findByRole('heading', { name: 'Tu cuenta está creada' })).toBeInTheDocument();
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/mis-reservas'), { timeout: 2000 });
    navigate('account');
    expect(await screen.findByText(/Hola, José Pérez/)).toBeInTheDocument();
    expect(screen.getByText(/0 reservas vinculadas/)).toBeInTheDocument();
  });

  it('requires consent for social registration as well', async () => {
    const { user } = setup(); await user.click(screen.getByRole('tab', { name: 'Crear cuenta' }));
    await user.click(screen.getByRole('button', { name: 'Registrarse con Google' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Acepta los términos');
    expect(screen.getByRole('checkbox', { name: /Acepto los Términos/ })).toHaveFocus();
    expect(screen.getByLabelText('Guest session')).toHaveTextContent('signed-out');
    await user.click(screen.getByRole('checkbox', { name: /Acepto los Términos/ }));
    await user.click(screen.getByRole('button', { name: 'Registrarse con Google' }));
    expect(await screen.findByRole('heading', { name: 'Tu cuenta está creada' })).toBeInTheDocument();
  });

  it('keeps the new profile and empty history when signing in again during the same app session', async () => {
    const { user, navigate } = setup(); fillRegistration(); submit();
    await screen.findByRole('heading', { name: 'Tu cuenta está creada' });
    navigate('profile'); await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    navigate('access'); fillEmail('jose@example.com'); submit();
    await screen.findByRole('heading', { name: 'Tu cuenta está lista' });
    navigate('account'); expect(await screen.findByText(/Hola, José Pérez/)).toBeInTheDocument();
    expect(screen.getByText(/0 reservas vinculadas/)).toBeInTheDocument();
  });

  it('preserves the safe checkout return for guests and after success', async () => {
    const destination = '/reserva/checkout?checkIn=2026-10-10&checkOut=2026-10-13&adults=2&children=0&roomsCount=1';
    setup(destination);
    expect(screen.getByRole('link', { name: 'Continuar como invitado' })).toHaveAttribute('href', destination);
    fillEmail(); submit();
    expect(await screen.findByRole('link', { name: 'Continuar mi reserva' })).toHaveAttribute('href', destination);
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith(destination), { timeout: 2000 });
  });

  it('never redirects to an untrusted returnTo', async () => {
    setup('https://evil.example/steal'); fillEmail(); submit();
    await screen.findByRole('heading', { name: 'Tu cuenta está lista' });
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/mis-reservas'), { timeout: 2000 });
  });

  it('opens accessible recovery information without pretending to send email', async () => {
    const { user } = setup(); const trigger = screen.getByRole('button', { name: '¿Olvidaste tu contraseña?' });
    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Recupera el acceso a tu cuenta' })).toBeInTheDocument();
    expect(screen.getByText(/La recuperación de contraseña por correo no está disponible/)).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(trigger).toHaveFocus();
  });

  it('reads legal information without auto-accepting consent', async () => {
    const { user } = setup(); await user.click(screen.getByRole('tab', { name: 'Crear cuenta' }));
    await user.click(screen.getByRole('button', { name: 'Leer términos' }));
    expect(screen.getByRole('dialog', { name: 'Términos y condiciones' })).toHaveTextContent('pendientes de publicación');
    await user.click(screen.getByRole('button', { name: 'Entendido' }));
    expect(screen.getByRole('checkbox', { name: /Acepto los Términos/ })).not.toBeChecked();
  });

  it('makes no authentication request when local mocks are off', async () => {
    const requests = vi.fn(); mockServer.use(http.post(endpoint, () => { requests(); return HttpResponse.json({}); }));
    setup(); vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false'); fillEmail(); submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('no está disponible');
    expect(requests).not.toHaveBeenCalled(); expect(navigation.replace).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Guest session')).toHaveTextContent('signed-out');
  });
});
