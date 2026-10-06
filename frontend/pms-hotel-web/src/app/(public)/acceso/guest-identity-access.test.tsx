import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/data/mocks/server';
import { resetAccountFixtures } from '@/data/mocks/account-fixtures';
import { GuestSessionProvider, useGuestSession } from '@/modules/auth';
import { GuestIdentityAccess } from './guest-identity-access';

const clients: QueryClient[] = [];
const navigation = { replace: vi.fn(), push: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), bfcacheId: 'identity-confirmation-test' };
beforeEach(() => { resetAccountFixtures(); vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true'); });
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.unstubAllEnvs(); vi.clearAllMocks(); });
function SessionObserver() { const session = useGuestSession(); return <output aria-label="Session identity">{JSON.stringify(session.account)}</output>; }
function setup(returnTo?: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  render(<AppRouterContext.Provider value={navigation}>
    <QueryClientProvider client={client}><GuestSessionProvider><SessionObserver /><GuestIdentityAccess returnTo={returnTo} /></GuestSessionProvider></QueryClientProvider>
  </AppRouterContext.Provider>);
  return userEvent.setup();
}
function emailAccess(email = 'demo@example.com') {
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'ExamplePass42!' } });
  fireEvent.submit(screen.getByLabelText('Correo electrónico').closest('form')!);
}
function registrationOptions(fullName = 'Alan Palacios') {
  fireEvent.click(screen.getByRole('tab', { name: 'Crear cuenta' }));
  fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: fullName } });
  fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'ExamplePass42!' } });
  fireEvent.click(screen.getByRole('checkbox', { name: /Acepto los Términos/ }));
}

describe('Linked account composition', () => {
  it('confirms email registration without storing demographics in GuestAccount', async () => {
    setup(); registrationOptions(); emailAccess();
    expect(await screen.findByRole('heading', { name: 'Cuenta vinculada' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Alan Palacios' })).toBeInTheDocument();
    expect(screen.getByText('AP')).toBeInTheDocument();
    expect(screen.getByText('Correo conectado')).toBeInTheDocument();
    expect(screen.queryByText('Correo verificado')).not.toBeInTheDocument();
    expect(screen.getByText(/Tu sesión con correo electrónico/)).toBeInTheDocument();
    expect(screen.getByText('Activa')).toBeInTheDocument();
    expect(screen.getByLabelText('Session identity')).not.toHaveTextContent('Palacios');
    expect(screen.getByLabelText('Session identity')).not.toHaveTextContent('ExamplePass42!');
    expect(navigation.replace).not.toHaveBeenCalled();
  });
  it('renders Google using the same confirmation and keeps the Guest session distinct', async () => {
    const user = setup(); registrationOptions(); await user.click(screen.getByRole('button', { name: 'Registrarse con Google' }));
    await screen.findByRole('heading', { name: 'Alan Palacios' });
    expect(screen.getByText('Google conectado')).toBeInTheDocument();
    expect(screen.getByText('guest.google@example.com')).toBeInTheDocument();
    expect(screen.getByText('Sin reservas vinculadas')).toBeInTheDocument();
    expect(screen.getByText(/El PMS no almacena tu contraseña de Google/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Vincular reserva existente' })).toHaveAttribute('href', '/cuenta/reservas/vincular');
    await user.click(screen.getByRole('button', { name: '← Volver a opciones' }));
    expect(await screen.findByRole('heading', { name: 'Accede a tu cuenta' })).toBeInTheDocument();
    expect(screen.queryByText('guest.google@example.com')).not.toBeInTheDocument();
  });
  it('reads the registered name from the separate profile and starts with no reservations', async () => {
    const user = setup(); await user.click(screen.getByRole('tab', { name: 'Crear cuenta' }));
    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'José Pérez' } });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'ExamplePass42!' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Acepto los Términos/ }));
    emailAccess('jose@example.com');
    expect(await screen.findByRole('heading', { name: 'José Pérez' })).toBeInTheDocument();
    expect(screen.getByText('JP')).toBeInTheDocument();
    expect(screen.getByText('Sin reservas vinculadas')).toBeInTheDocument();
  });
  it('offers the explicit checkout return while preserving search parameters', async () => {
    const destination = '/reserva/checkout?checkIn=2026-10-10&checkOut=2026-10-13&adults=2&children=0&roomsCount=1';
    setup(destination); registrationOptions(); emailAccess();
    expect(await screen.findByRole('complementary', { name: 'Reserva en curso' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Volver al Checkout/ })).toHaveAttribute('href', destination);
    expect(screen.getByRole('link', { name: 'Continuar reservando' })).toHaveAttribute('href', destination);
  });
  it('redirects an existing real session without requesting registration details or inventing identity', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false');
    const summaryRead = vi.fn();
    mockServer.use(http.get('*/api/auth/guest/session', () => HttpResponse.json({ guestAccountId: 'own', sessionId: 'own-session', email: 'own@example.test', context: 'GUEST' })),
      http.get('*/api/auth/guest/account/summary', () => { summaryRead(); return HttpResponse.json({}); }));
    setup();
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledExactlyOnceWith('/cuenta'));
    expect(screen.queryByRole('heading', { name: 'Cuenta vinculada' })).not.toBeInTheDocument();
    expect(screen.queryByText('Correo verificado')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Session identity')).not.toHaveTextContent('externalIdentities');
    expect(summaryRead).not.toHaveBeenCalled();
  });
  it('keeps the confirmed session usable on a summary failure and allows retry', async () => {
    const user = setup();
    mockServer.use(http.get('http://pms.test/account/summary', () => new HttpResponse(null, { status: 503 })));
    registrationOptions(); emailAccess();
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar los detalles');
    expect(screen.getByRole('heading', { name: 'Cuenta vinculada' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ir a mi cuenta/ })).toHaveAttribute('href', '/cuenta');
    expect(screen.queryByText('Activa')).not.toBeInTheDocument();
    mockServer.resetHandlers(); await user.click(screen.getByRole('button', { name: 'Reintentar detalles' }));
    expect(await screen.findByRole('heading', { name: 'Alan Palacios' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it.each(['email', 'google'] as const)('sends %s login straight to the account without rendering or fetching the confirmation', async provider => {
    const summaryRead = vi.fn();
    mockServer.use(http.get('http://pms.test/account/summary', () => { summaryRead(); return HttpResponse.json({}); }));
    const user = setup();
    if (provider === 'email') emailAccess();
    else await user.click(screen.getByRole('button', { name: 'Continuar con Google' }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledExactlyOnceWith('/cuenta'));
    expect(screen.queryByRole('heading', { name: 'Cuenta vinculada' })).not.toBeInTheDocument();
    expect(summaryRead).not.toHaveBeenCalled();
  });
});
