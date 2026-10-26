import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { GuestSessionProvider } from '@/modules/auth';
import { mockServer } from '@/data/mocks/server';
import { guestHistorySession as session, guestHistoryAccount as owner, guestHistoryPage as page, guestHistoryDetail as detail, guestHistoryReservation as item, guestLinkRequestId } from '@/test/real-guest-reservations-fixture';
import { RealGuestReservationsPage, RealGuestReservationDetail } from './real-guest-reservations';
import { ReservationLinkForm } from './reservation-link-form';

const clients: QueryClient[] = [];
beforeEach(() => { vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false'); localStorage.clear(); sessionStorage.clear(); mockServer.use(http.get('*/api/auth/guest/session', () => HttpResponse.json(session))); });
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); onlineManager.setOnline(true); vi.unstubAllEnvs(); vi.useRealTimers(); });
function mount(content = <RealGuestReservationsPage />) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } }); clients.push(client);
  render(<QueryClientProvider client={client}><GuestSessionProvider>{content}</GuestSessionProvider></QueryClientProvider>); return client;
}
async function requestLink() {
  const input = await screen.findByLabelText('Referencia de reserva'); fireEvent.change(input, { target: { value: item.confirmationCode } }); fireEvent.submit(input.closest('form')!);
  return screen.findByLabelText('Código de verificación');
}
function submitCode(input: HTMLElement, value = '12345678') { fireEvent.change(input, { target: { value } }); fireEvent.submit(input.closest('form')!); }

describe('real linked Guest reservations UI', () => {
  it('keeps loading distinct from empty and renders all stays from the actual response', async () => {
    let resolve!: () => void; const pending = new Promise<void>(r => { resolve = r; });
    mockServer.use(http.get('*/api/auth/guest/account/reservations', async ({ request }) => {
      expect(request.headers.get('authorization')).toBeNull(); expect(new URL(request.url).search).toBe('?page=0&size=20');
      await pending; return HttpResponse.json({ ...page, items: [{ ...item, stays: [...item.stays, { ...item.stays[0], reservationStayId: guestLinkRequestId, roomTypeName: 'Suite Terraza', status: 'IN_HOUSE' }] }] });
    }));
    mount(); await screen.findByText('Consultando tus reservas…'); expect(screen.queryByText(/Aún no hay reservas/)).not.toBeInTheDocument();
    await act(async () => { resolve(); }); await screen.findByText(item.confirmationCode);
    expect(screen.getByText('Deluxe King')).toBeInTheDocument(); expect(screen.getByText('Suite Terraza')).toBeInTheDocument(); expect(screen.getByText('En curso')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: `Ver detalle de ${item.confirmationCode}` })).toHaveAttribute('href', `/cuenta/reservas/${item.reservationId}`);
    expect(screen.queryByText(/US\$|Q\s*505|Política:/)).not.toBeInTheDocument();
  });
  it('shows an honest empty state explaining how to link a confirmed anonymous booking', async () => {
    mockServer.use(http.get('*/api/auth/guest/account/reservations', () => HttpResponse.json({ ...page, totalElements: 0, items: [] })));
    mount(); await screen.findByText('Aún no hay reservas vinculadas a esta cuenta.');
    expect(screen.getByRole('link', { name: 'Vincular mi reserva' })).toHaveAttribute('href', '/cuenta/reservas/vincular'); expect(screen.getByText(/tu reserva puede estar confirmada/)).toBeInTheDocument();
  });
  it('handles a failed request as a retryable error rather than claiming there are no bookings', async () => {
    let failed = true; mockServer.use(http.get('*/api/auth/guest/account/reservations', () => failed ? new HttpResponse(null, { status: 503 }) : HttpResponse.json(page)));
    mount(); expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos consultar'); expect(screen.queryByText(/Aún no hay reservas/)).not.toBeInTheDocument();
    failed = false; fireEvent.click(screen.getByRole('button', { name: 'Reintentar consulta' })); expect(await screen.findByText(item.confirmationCode)).toBeInTheDocument();
  });
  it('does not show stale data if a scoped response contains another account', async () => {
    mockServer.use(http.get('*/api/auth/guest/account/reservations', () => HttpResponse.json({ ...page, guestAccountId: guestLinkRequestId })));
    mount(); await screen.findByRole('alert'); expect(screen.queryByText(item.confirmationCode)).not.toBeInTheDocument();
  });
  it('paginates through actual pages and reads a detail independently of page 1', async () => {
    const reads: string[] = [];
    mockServer.use(http.get('*/api/auth/guest/account/reservations', ({ request }) => {
      const current = Number(new URL(request.url).searchParams.get('page')); reads.push(request.url);
      return HttpResponse.json({ ...page, page: current, totalElements: 21, items: current === 0 ? Array.from({ length: 20 }, (_, i) => ({ ...item, reservationId: `33333333-3333-4333-8333-${String(i).padStart(12, '0')}`, confirmationCode: `HB-${i}` })) : [item] });
    }));
    mount(); await screen.findByText('Página 1 de 2'); fireEvent.click(screen.getByRole('button', { name: 'Siguiente →' }));
    await screen.findByText(item.confirmationCode); expect(screen.getByText('Página 2 de 2')).toBeInTheDocument(); expect(reads.at(-1)).toContain('page=1');
    cleanup(); mockServer.use(http.get(`*/api/auth/guest/account/reservations/${item.reservationId}`, () => HttpResponse.json(detail)));
    mount(<RealGuestReservationDetail reservationId={item.reservationId} />); await screen.findByText(item.confirmationCode); expect(reads).toHaveLength(2);
  });
  it('makes unknown and unlinked detail ids equally unavailable', async () => {
    mockServer.use(http.get(`*/api/auth/guest/account/reservations/${item.reservationId}`, () => new HttpResponse(null, { status: 404 })));
    mount(<RealGuestReservationDetail reservationId={item.reservationId} />); expect(await screen.findByRole('alert')).toHaveTextContent('Esta reserva no está disponible en tu cuenta.'); expect(screen.queryByText(item.confirmationCode)).not.toBeInTheDocument();
  });
});

describe('real Guest OTP linking UI', () => {
  beforeEach(() => { mockServer.use(http.post('*/api/auth/guest/reservation-links/challenges', () => HttpResponse.json({ requestId: guestLinkRequestId }, { status: 202 }))); });
  it('uses approved request bodies and waits for real 204 before invalidating only this account', async () => {
    let resolve!: () => void; const pending = new Promise<void>(r => { resolve = r; }); let verifications = 0;
    mockServer.use(http.post('*/api/auth/guest/reservation-links/challenges', async ({ request }) => {
      expect(await request.json()).toEqual({ confirmationCode: item.confirmationCode }); expect(request.headers.get('authorization')).toBeNull(); return HttpResponse.json({ requestId: guestLinkRequestId }, { status: 202 });
    }), http.post('*/api/auth/guest/reservation-links/verify', async ({ request }) => {
      verifications++; expect(await request.json()).toEqual({ requestId: guestLinkRequestId, otp: '12345678' }); await pending; return new HttpResponse(null, { status: 204 });
    }));
    const client = mount(<ReservationLinkForm />); client.setQueryData(['guest', 'reservations', owner, 0, 20], page); client.setQueryData(['staff', 'sentinel'], true); client.setQueryData(['guest', 'reservations', guestLinkRequestId], 'other');
    const input = await requestLink(); expect(input).toHaveFocus(); expect(screen.queryByText('Reserva vinculada a tu cuenta.')).not.toBeInTheDocument();
    submitCode(input); fireEvent.submit(input.closest('form')!); await waitFor(() => expect(verifications).toBe(1));
    expect(screen.getByRole('button', { name: 'Verificando…' })).toBeDisabled(); expect(screen.queryByText('Reserva vinculada a tu cuenta.')).not.toBeInTheDocument();
    await act(async () => { resolve(); }); await screen.findByText('Reserva vinculada a tu cuenta.');
    expect(client.getQueryState(['guest', 'reservations', owner, 0, 20])?.isInvalidated).toBe(true); expect(client.getQueryState(['guest', 'reservations', guestLinkRequestId])?.isInvalidated).toBe(false); expect(client.getQueryData(['staff', 'sentinel'])).toBe(true);
    expect(localStorage.length).toBe(0); expect(sessionStorage.length).toBe(0); expect(screen.getByRole('link', { name: 'Ver mis reservas →' })).toHaveAttribute('href', '/mis-reservas');
  });
  it('keeps generic 202/422 responses honest and permits a corrected OTP without losing the reference', async () => {
    let good = false; mockServer.use(http.post('*/api/auth/guest/reservation-links/verify', () => good ? new HttpResponse(null, { status: 204 }) : new HttpResponse(null, { status: 422 })));
    mount(<ReservationLinkForm />); const input = await requestLink(); expect(screen.getByText(/Si la referencia y el correo coinciden/)).toBeInTheDocument();
    submitCode(input, '00000000'); expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos verificar la reserva'); expect(screen.queryByText('Reserva vinculada a tu cuenta.')).not.toBeInTheDocument();
    good = true; submitCode(input); await screen.findByText('Reserva vinculada a tu cuenta.');
  });
  it('never reports success on an uncertain transport result or malformed verification body', async () => {
    mockServer.use(http.post('*/api/auth/guest/reservation-links/verify', () => HttpResponse.json({ reservationId: item.reservationId })));
    mount(<ReservationLinkForm />); submitCode(await requestLink()); expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos comprobar el resultado'); expect(screen.queryByText('Reserva vinculada a tu cuenta.')).not.toBeInTheDocument();
  });
  it('validates the reference and OTP before sending and blocks offline mutations', async () => {
    const read = vi.fn(); mockServer.use(http.post('*/api/auth/guest/reservation-links/verify', read)); mount(<ReservationLinkForm />);
    const reference = await screen.findByLabelText('Referencia de reserva'); fireEvent.submit(reference.closest('form')!); expect(await screen.findByRole('alert')).toHaveTextContent('Ingresa la referencia'); expect(reference).toHaveFocus();
    const input = await requestLink(); submitCode(input, '12'); await screen.findByRole('alert'); expect(read).not.toHaveBeenCalled();
    act(() => onlineManager.setOnline(false)); submitCode(input); await screen.findByText(/No pudimos comprobar el resultado/); expect(read).not.toHaveBeenCalled();
  });
  it('clears a challenge and ignores a late verification when the Guest session changes', async () => {
    let resolve!: () => void; const pending = new Promise<void>(r => { resolve = r; });
    const verify = vi.fn(async () => { await pending; return new HttpResponse(null, { status: 204 }); });
    mockServer.use(http.post('*/api/auth/guest/reservation-links/verify', verify));
    const client = mount(<ReservationLinkForm />); submitCode(await requestLink());
    await waitFor(() => expect(verify).toHaveBeenCalledOnce());
    await act(async () => { client.setQueryData(['guest-session'], { id: guestLinkRequestId, context: 'GUEST', account: { id: owner, email: session.email } }); });
    expect(await screen.findByLabelText('Referencia de reserva')).toHaveValue(''); expect(screen.queryByLabelText('Código de verificación')).not.toBeInTheDocument();
    await act(async () => { resolve(); }); expect(screen.queryByText('Reserva vinculada a tu cuenta.')).not.toBeInTheDocument();
  });
  it('respects the approved resend cooldown without inventing an OTP expiration timestamp', async () => {
    vi.useFakeTimers({ toFake: ['Date'] }); const start = new Date('2026-10-25T12:00:00Z'); vi.setSystemTime(start);
    let requests = 0; mockServer.use(http.post('*/api/auth/guest/reservation-links/challenges', () => { requests++; return HttpResponse.json({ requestId: guestLinkRequestId }, { status: 202 }); }));
    mount(<ReservationLinkForm />); await requestLink();
    expect(screen.getByRole('button', { name: 'Solicitar un nuevo código (60s)' })).toBeDisabled(); expect(requests).toBe(1);
    vi.setSystemTime(new Date(start.getTime() + 61000));
    // The UI ticks once a second; wait for that documented transition, not an HTTP timeout.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Solicitar un nuevo código' })).toBeEnabled(), { timeout: 2000 });
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar un nuevo código' })); await waitFor(() => expect(requests).toBe(2));
    expect(screen.queryByText(/vence a las|expiresAt/i)).not.toBeInTheDocument();
  });
});
