import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/data/mocks/server';
import { publicCatalogueFixture } from '@/data/mocks/public-catalogue';
import { buildPublicAvailabilityMock } from '@/data/mocks/public-availability';
import { resetPublicCheckoutFixtures } from '@/data/mocks/public-checkout-handlers';
import { GuestSessionProvider } from '@/modules/auth';
import { PublicBookingProvider, PublicRoomDetailPage } from '@/modules/booking';
import { CheckoutDraftProvider } from './checkout-draft-provider';
import { PublicGuestDataPage } from './public-guest-data-page';
import { PublicPaymentReviewPage } from './public-payment-review-page';
import { PublicBookingConfirmationPage } from './public-booking-confirmation-page';

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
const criteria = { checkIn: '2026-10-10', checkOut: '2026-10-13', adults: 2, children: 0, roomsCount: 1 };
const clients: QueryClient[] = [];
beforeEach(() => { push.mockClear(); vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-05T12:00:00Z')); vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://pms.test'); vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true'); resetPublicCheckoutFixtures(); });
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); onlineManager.setOnline(true); vi.useRealTimers(); vi.unstubAllEnvs(); });
function mount(component = <PublicRoomDetailPage roomTypeId="rt_deluxe_king" initialCriteria={criteria}/>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clients.push(client);
  return render(component, { wrapper: ({ children }) => <QueryClientProvider client={client}><GuestSessionProvider><PublicBookingProvider><CheckoutDraftProvider>{children}</CheckoutDraftProvider></PublicBookingProvider></GuestSessionProvider></QueryClientProvider> });
}
async function prepared(multiple = false) {
  const view = mount(); fireEvent.click(await screen.findByRole('button', { name: 'Seleccionar habitación' }));
  if (multiple) { view.rerender(<PublicRoomDetailPage roomTypeId="rt_double_superior" initialCriteria={criteria}/>); fireEvent.click(await screen.findByRole('button', { name: 'Seleccionar habitación' })); }
  view.rerender(<PublicGuestDataPage initialCriteria={criteria}/>); await screen.findByLabelText('Nombre *');
  for (const [label, value] of [['Nombre *','Carlos'],['Apellidos *','Mendoza'],['Correo electrónico *','guest@example.com'],['Teléfono *','5555 5555']]) fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.submit(screen.getByLabelText('Nombre *').closest('form')!); await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining('/checkout/pago?'))); push.mockClear();
  view.rerender(<PublicPaymentReviewPage initialCriteria={criteria}/>); await screen.findByRole('button', { name: 'Garantizar y confirmar reserva' }); return view;
}
function confirm() { fireEvent.click(screen.getByRole('button', { name: 'Garantizar y confirmar reserva' })); }
describe('Public payment and guarantee journey', () => {
  it('keeps contact/search, computes guarantee separately, and confirms once without creating an account', async () => {
    const view = await prepared(); const summary = screen.getByRole('complementary');
    expect(summary).toHaveTextContent('US$ 505.00'); expect(summary).toHaveTextContent('US$ 168.33'); expect(summary).toHaveTextContent('US$ 336.67');
    expect(screen.getByRole('link', { name: '← Volver a datos' })).toHaveAttribute('href', expect.stringContaining('checkIn=2026-10-10'));
    confirm(); await screen.findByRole('button', { name: /Procesando garantía de prueba/ }); expect(screen.getByRole('button', { name: /Procesando garantía/ })).toBeDisabled();
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1), { timeout: 3000 }); expect(push).toHaveBeenCalledWith(expect.stringContaining('/reserva/confirmacion?checkIn=2026-10-10'));
    view.rerender(<PublicBookingConfirmationPage initialCriteria={criteria}/>); expect(screen.getByRole('heading', { name: 'HB-2026-8942' })).toBeInTheDocument(); expect(screen.getByText(/Sin débito real/)).toBeInTheDocument();
    view.rerender(<PublicPaymentReviewPage initialCriteria={criteria}/>); expect(await screen.findByText('Ya completaste esta demostración')).toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Garantizar y confirmar reserva' })).not.toBeInTheDocument();
    expect(localStorage.length).toBe(0); expect(sessionStorage.length).toBe(0);
  });
  it('recovers from declined cards and provider errors and preserves the same guest data', async () => {
    await prepared();
    fireEvent.change(screen.getByLabelText('Resultado de demostración'), { target: { value: 'demo_card_declined' } }); confirm(); expect(await screen.findByRole('alert')).toHaveTextContent(/rechazada/); expect(push).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Resultado de demostración'), { target: { value: 'demo_gateway_error' } }); confirm(); expect(await screen.findByRole('alert')).toHaveTextContent(/no está disponible/); expect(push).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Resultado de demostración'), { target: { value: 'demo_visa_approved' } }); confirm(); await waitFor(() => expect(push).toHaveBeenCalledTimes(1), { timeout: 3000 });
  });
  it('rejects price changes before submitting a guarantee', async () => {
    await prepared(); const writes = vi.fn(); mockServer.use(http.post('http://pms.test/__mock/checkout/confirmations', () => { writes(); return HttpResponse.json({}); }), http.get('*/api/v1/public/availability', ({ request }) => {
      const dto = structuredClone(buildPublicAvailabilityMock(new URL(request.url).searchParams, publicCatalogueFixture)!);
      const rate = dto.available_room_types[0].rate_plans[0]; rate.base_nightly_rate = '146.00'; rate.total_amount = '438.00'; rate.stay_price_breakdown!.estimated_total = '508.00'; return HttpResponse.json(dto);
    }));
    confirm(); expect(await screen.findByRole('alert')).toHaveTextContent(/tarifa cambió/); expect(writes).not.toHaveBeenCalled(); expect(push).not.toHaveBeenCalled();
  });
  it('blocks exhausted availability and offline submission', async () => {
    await prepared(); const writes = vi.fn(); mockServer.use(http.post('http://pms.test/__mock/checkout/confirmations', () => { writes(); return HttpResponse.json({}); }));
    onlineManager.setOnline(false); confirm(); expect(await screen.findByRole('alert')).toHaveTextContent(/Sin conexión/); expect(writes).not.toHaveBeenCalled(); onlineManager.setOnline(true);
    mockServer.use(http.get('*/api/v1/public/availability', ({ request }) => { const dto = structuredClone(buildPublicAvailabilityMock(new URL(request.url).searchParams, publicCatalogueFixture)!); dto.available_room_types[0].available_rooms_count = 0; return HttpResponse.json(dto); }));
    confirm(); expect(await screen.findByRole('region', { name: 'Revisa tu selección antes de continuar' })).toBeInTheDocument(); expect(writes).not.toHaveBeenCalled(); expect(push).not.toHaveBeenCalled();
  });
  it('returns a single confirmation with all stays in a multi-room selection', async () => {
    const view = await prepared(true); expect(screen.getByRole('complementary')).toHaveTextContent('US$ 950.00'); confirm(); await waitFor(() => expect(push).toHaveBeenCalledTimes(1), { timeout: 3000 });
    view.rerender(<PublicBookingConfirmationPage initialCriteria={criteria}/>); expect(screen.getByText(/Confirmación simulada · 2 habitaciones/)).toBeInTheDocument(); expect(screen.getByText('Deluxe King')).toBeInTheDocument(); expect(screen.getByText('Doble Superior')).toBeInTheDocument();
  });
  it('guards direct/reloaded confirmation and never posts with mocks disabled', async () => {
    const view = mount(<PublicBookingConfirmationPage initialCriteria={criteria}/>); expect(screen.getByRole('region', { name: 'No hay una confirmación en esta sesión' })).toBeInTheDocument(); view.unmount();
    const payment = await prepared(); vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false'); payment.rerender(<PublicPaymentReviewPage initialCriteria={criteria}/>);
    expect(await screen.findByRole('button', { name: 'Garantizar y confirmar reserva' })).toBeDisabled(); expect(screen.queryByTitle('Formulario aislado de tarjeta de prueba')).not.toBeInTheDocument(); expect(push).not.toHaveBeenCalled();
  });
});
