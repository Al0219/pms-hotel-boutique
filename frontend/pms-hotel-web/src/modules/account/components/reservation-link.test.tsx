import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GuestSessionProvider, useGuestSession } from '@/modules/auth';
import { mockServer } from '@/data/mocks/server';
import { resetAccountFixtures } from '@/data/mocks/account-fixtures';
import { delay, http, HttpResponse } from 'msw';
import { GuestReservationsPage } from './guest-reservations-page';
const replace = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
const clients: QueryClient[] = [];
beforeEach(() => { resetAccountFixtures(); replace.mockClear(); vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true'); });
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); onlineManager.setOnline(true); vi.unstubAllEnvs(); vi.useRealTimers(); });
function DemoLogin({ email }: { email?: string }) {
  const session = useGuestSession();
  return <button onClick={() => void session.signIn(email ? { method: 'EMAIL', email } : { method: 'GOOGLE' })}>Entrar al demo</button>;
}
function mount(email?: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } }); clients.push(client);
  render(<QueryClientProvider client={client}><GuestSessionProvider><DemoLogin email={email} /><GuestReservationsPage /></GuestSessionProvider></QueryClientProvider>);
  return client;
}
async function login() { const client = mount(); fireEvent.click(screen.getByRole('button', { name: 'Entrar al demo' })); await screen.findByText('No tienes reservas vinculadas.'); return client; }
function send(reference = 'HB-2026-10420') {
  fireEvent.change(screen.getByLabelText('Referencia de reserva'), { target: { value: reference } });
  fireEvent.submit(screen.getByLabelText('Referencia de reserva').closest('form')!);
}
async function verify(otp = '12345678') {
  const field = await screen.findByLabelText('Código de verificación');
  fireEvent.change(field, { target: { value: otp } }); fireEvent.submit(field.closest('form')!);
}

describe('Guest reservation link demonstration', () => {
  it('redirects anonymous visitors to contextual access without showing private records', () => {
    mount(); expect(replace).toHaveBeenCalledWith('/acceso?returnTo=%2Fmis-reservas');
    expect(screen.queryByRole('heading', { name: 'Mis reservas' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Referencia de reserva')).not.toBeInTheDocument();
  });
  it('validates, rejects a wrong code and links multiple reservations only after verification', async () => {
    await login();
    fireEvent.submit(screen.getByLabelText('Referencia de reserva').closest('form')!);
    expect(screen.getByRole('alert')).toHaveTextContent('Ingresa la referencia'); expect(screen.getByLabelText('Referencia de reserva')).toHaveFocus();
    send(); const otp = await screen.findByLabelText('Código de verificación'); expect(otp).toHaveFocus();
    expect(screen.queryByRole('link', { name: 'HB-2026-10420' })).not.toBeInTheDocument();
    await verify('00000000'); expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos verificar la reserva');
    expect(screen.queryByRole('link', { name: 'HB-2026-10420' })).not.toBeInTheDocument();
    await verify(); await screen.findByText('Reserva HB-2026-10420 vinculada en la demostración.');
    expect(screen.getByRole('link', { name: 'HB-2026-10420' })).toHaveAttribute('href', '/cuenta/reservas/HB-2026-10420');
    expect(screen.getByText(/2 estadías · Responsable: Carlos Mendoza/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Vincular otra reserva' }));
    send('HB-2026-10421'); await verify(); await screen.findByText('Reserva HB-2026-10421 vinculada en la demostración.');
    expect(screen.getByText('2 reservas vinculadas')).toBeInTheDocument(); expect(screen.getByRole('link', { name: 'HB-2026-10421' })).toBeInTheDocument();
    expect(localStorage.length).toBe(0); expect(sessionStorage.length).toBe(0);
  });
  it('blocks duplicate requests and preserves one history record when linking again', async () => {
    let requests = 0;
    mockServer.events.on('request:start', ({ request }) => { if (request.url.endsWith('/__mock/reservation-links/challenges')) requests++; });
    await login(); send(); fireEvent.submit(screen.getByLabelText('Referencia de reserva').closest('form')!);
    expect(screen.getByRole('button', { name: 'Preparando código…' })).toBeDisabled();
    await verify(); await screen.findByText('Reserva HB-2026-10420 vinculada en la demostración.'); expect(requests).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: 'Vincular otra reserva' })); send(); await verify();
    await screen.findByText('Reserva HB-2026-10420 vinculada en la demostración.'); expect(screen.getByText('1 reserva vinculada')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'HB-2026-10420' })).toHaveLength(1);
    mockServer.events.removeAllListeners('request:start');
  });
  it('handles expiration and permits resending a fresh challenge', async () => {
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-05T12:00:00Z'));
    await login(); send(); await screen.findByLabelText('Código de verificación');
    vi.setSystemTime(new Date('2026-10-05T12:06:00Z')); await verify(); expect(await screen.findByRole('alert')).toHaveTextContent('El código venció');
    fireEvent.click(screen.getByRole('button', { name: 'Reenviar código de prueba' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Verificar y vincular reserva' })).not.toBeDisabled());
    await verify(); expect(await screen.findByText('Reserva HB-2026-10420 vinculada en la demostración.')).toBeInTheDocument();
  });
  it('keeps the reference on network failure and recovers without queuing a link', async () => {
    await login(); act(() => onlineManager.setOnline(false)); send();
    expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión'); expect(screen.getByLabelText('Referencia de reserva')).toHaveValue('HB-2026-10420');
    expect(screen.queryByLabelText('Código de verificación')).not.toBeInTheDocument();
    act(() => onlineManager.setOnline(true)); send(); expect(await screen.findByLabelText('Código de verificación')).toBeInTheDocument();
  });
  it('does not repopulate Guest cache or show success when signed out during verification', async () => {
    const client = await login(); client.setQueryDefaults(['staff'], { gcTime: Infinity }); client.setQueryData(['staff', 'sentinel'], { active: true }); send();
    mockServer.use(http.post('http://pms.test/__mock/reservation-links/verify', async ({ request }) => { const input = await request.json() as { request_id: string }; await delay(500); return HttpResponse.json({ account_id: 'guest-demo-google', request_id: input.request_id, reservation_id: 'HB-2026-10420' }); }));
    await verify(); fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    await waitFor(() => expect(client.getQueriesData({ queryKey: ['guest'] })).toHaveLength(0));
    expect(screen.queryByText(/vinculada en la demostración/)).not.toBeInTheDocument(); expect(client.getQueryData(['staff', 'sentinel'])).toEqual({ active: true });
    expect(screen.queryByLabelText('Código de verificación')).not.toBeInTheDocument();
  });
  it('offers Google for linking from an email demo session without exposing the link form', async () => {
    mount('demo@example.com'); fireEvent.click(screen.getByRole('button', { name: 'Entrar al demo' }));
    expect(await screen.findByRole('link', { name: 'Acceder con Google →' })).toHaveAttribute('href', '/acceso?returnTo=%2Fmis-reservas');
    expect(screen.queryByLabelText('Referencia de reserva')).not.toBeInTheDocument();
  });
});
