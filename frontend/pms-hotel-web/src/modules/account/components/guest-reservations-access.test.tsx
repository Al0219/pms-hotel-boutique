import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { GuestSessionProvider } from '@/modules/auth';
import { mockServer } from '@/data/mocks/server';
import { GuestReservationsPage } from './guest-reservations-page';

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
const clients: QueryClient[] = [];
const guest = { guestAccountId: '11111111-1111-4111-8111-111111111111', sessionId: '22222222-2222-4222-8222-222222222222', email: 'guest@example.test', context: 'GUEST' };
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false'); router.replace.mockClear();
  mockServer.use(http.post('*/api/auth/guest/account/reservations/reconcile', () => new HttpResponse(null, { status: 204 })),
    http.get('*/api/auth/guest/account/reservations', () => HttpResponse.json([])));
});
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.unstubAllEnvs(); });
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); clients.push(client);
  return render(<QueryClientProvider client={client}><GuestSessionProvider><GuestReservationsPage /></GuestSessionProvider></QueryClientProvider>);
}

describe('Guest reservation access restoration', () => {
  it('waits for a valid Guest session instead of sending a restoring customer back to login', async () => {
    let restore!: () => void;
    const pending = new Promise<void>(resolve => { restore = resolve; });
    const read = vi.fn(async () => { await pending; return HttpResponse.json(guest); });
    mockServer.use(http.get('*/api/auth/guest/session', read));
    mount();
    await waitFor(() => expect(read).toHaveBeenCalledOnce());
    const prematureRedirects = [...router.replace.mock.calls];
    restore();
    await screen.findByRole('heading', { name: 'Mis reservas' });
    expect(prematureRedirects).toHaveLength(0);
    expect(router.replace).not.toHaveBeenCalled();
  });
  it('keeps accountless lookup available when the independent Guest session check fails', async () => {
    mockServer.use(http.get('*/api/auth/guest/session', () => new HttpResponse(null, { status: 503 })));
    mount();
    expect(await screen.findByLabelText('Correo utilizado al reservar')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ya tengo una cuenta' })).toHaveAttribute('href', '/acceso?returnTo=%2Fmis-reservas');
    expect(router.replace).not.toHaveBeenCalled();
  });
  it('opens email and reference lookup without requiring an account after a signed-out result', async () => {
    mockServer.use(http.get('*/api/auth/guest/session', () => new HttpResponse(null, { status: 401 })),
      http.post('*/api/auth/guest/refresh', () => new HttpResponse(null, { status: 401 })));
    mount();
    await screen.findByLabelText('Correo utilizado al reservar');
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalledWith('/dashboard');
    expect(screen.getByRole('heading', { name: 'Mis reservas' })).toBeInTheDocument();
  });
});
