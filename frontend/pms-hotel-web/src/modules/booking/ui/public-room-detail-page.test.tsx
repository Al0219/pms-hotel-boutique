import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/data/mocks/server';
import { publicCatalogueFixture } from '@/data/mocks/public-catalogue';
import { PublicBookingProvider } from '../components/public-booking-provider';
import { PublicRoomDetailPage } from './public-room-detail-page';
import { PublicAvailabilityPage } from './public-availability-page';
import type { BookingSearchCriteria } from '../domain/booking-search-criteria';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
const criteria = { checkIn: '2026-10-10', checkOut: '2026-10-13', adults: 2, children: 0, roomsCount: 1 };
const clients: QueryClient[] = [];
beforeEach(() => { push.mockClear(); vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-04T12:00:00Z')); vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://pms.test'); vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true'); });
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); onlineManager.setOnline(true); vi.useRealTimers(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
function mount({ roomTypeId = 'rt_deluxe_king', initialCriteria = criteria, initialRatePlanId }: { roomTypeId?: string; initialCriteria?: Partial<BookingSearchCriteria>; initialRatePlanId?: string } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clients.push(client);
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}><PublicBookingProvider>{children}</PublicBookingProvider></QueryClientProvider>;
  return render(<PublicRoomDetailPage roomTypeId={roomTypeId} initialCriteria={initialCriteria} initialRatePlanId={initialRatePlanId} />, { wrapper });
}
async function loaded() { return screen.findByRole('heading', { name: 'Deluxe King', level: 1 }); }

describe('Public RoomType detail', () => {
  it('preserves search in back link and renders sticky quote, amenities and three penalty levels', async () => {
    mount({ initialCriteria: { ...criteria, adults: 3, children: 1, roomsCount: 2, promoCode: 'BOUTIQUE' } }); await loaded();
    expect(screen.getByRole('link', { name: '← Volver a resultados' })).toHaveAttribute('href', '/habitaciones?checkIn=2026-10-10&checkOut=2026-10-13&adults=3&children=1&roomsCount=2&promoCode=BOUTIQUE');
    const stay = screen.getByRole('complementary', { name: 'Tu estadía' });
    expect(stay).toHaveTextContent('3 noches · 4 huéspedes');
    expect(within(stay).getByText('US$ 435.00')).toBeInTheDocument();
    expect(within(stay).getByText('US$ 22.00')).toBeInTheDocument();
    expect(within(stay).getByText('US$ 48.00')).toBeInTheDocument();
    expect(within(stay).getByText('US$ 505.00')).toBeInTheDocument();
    expect(screen.getByText('Sin cargo')).toBeInTheDocument(); expect(screen.getByText('50% del total')).toBeInTheDocument(); expect(screen.getByText('Total de la reserva')).toBeInTheDocument();
    expect(screen.getByText('Wi-Fi de alta velocidad')).toBeInTheDocument(); expect(screen.getByText('Caja de seguridad')).toBeInTheDocument();
    expect(screen.getByText(/El código BOUTIQUE aún debe validarse/)).toBeInTheDocument();
  });
  it('navigates carousel with arrows, thumbnails and keyboard and handles failed images', async () => {
    mount(); await loaded();
    const gallery = screen.getByRole('region', { name: 'Fotografías de Deluxe King' });
    fireEvent.click(within(gallery).getByRole('button', { name: 'Fotografía siguiente' }));
    expect(within(gallery).getByRole('button', { name: 'Ver fotografía 2' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(gallery).getByRole('button', { name: 'Ver fotografía 3' }));
    expect(within(gallery).getByText('3 / 3')).toBeInTheDocument();
    fireEvent.click(within(gallery).getByRole('button', { name: 'Fotografía siguiente' })); expect(within(gallery).getByText('1 / 3')).toBeInTheDocument();
    fireEvent.keyDown(within(gallery).getByText('1 / 3').parentElement!, { key: 'ArrowLeft' }); expect(within(gallery).getByText('3 / 3')).toBeInTheDocument();
    fireEvent.error(within(gallery).getByRole('img', { name: 'Deluxe King · vista 3 (ilustrativa)' }));
    expect(within(gallery).getByText('Fotografía no disponible')).toBeInTheDocument();
  });
  it('adds once, shows toast and preserves selection and GTQ when returning to catalogue', async () => {
    const view = mount(); await loaded();
    fireEvent.change(screen.getByLabelText('Mostrar precios en'), { target: { value: 'GTQ' } });
    expect(screen.getByText('Q 3,858.89')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar habitación' }));
    expect(screen.getByRole('status')).toHaveTextContent('Deluxe King agregada a tu selección.');
    expect(screen.getByRole('button', { name: 'Revisar mi selección' })).toBeEnabled();
    expect(push).toHaveBeenCalledWith('/reserva?checkIn=2026-10-10&checkOut=2026-10-13&adults=2&children=0&roomsCount=1');
    const cartTrigger = screen.getByRole('button', { name: 'Mi Selección (1)' }); cartTrigger.focus(); fireEvent.click(cartTrigger);
    const cart = screen.getByRole('dialog', { name: 'Mi selección' }); expect(cart).toHaveTextContent('Q 3,858.89');
    fireEvent.keyDown(window, { key: 'Escape' }); await waitFor(() => expect(cartTrigger).toHaveFocus());
    view.rerender(<PublicAvailabilityPage initialCriteria={criteria} />);
    const card = await screen.findByRole('article', { name: 'Deluxe King' }); expect(within(card).getByRole('button', { name: 'Seleccionada' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Mostrar precios en')).toHaveValue('GTQ');
  });
  it('retains non-refundable policy when the user changes plan and updates the same selection', async () => {
    const view = mount(); await loaded(); fireEvent.click(screen.getByRole('button', { name: 'Seleccionar habitación' }));
    fireEvent.change(screen.getByLabelText('Plan de tarifa'), { target: { value: 'rp_non_refundable' } });
    expect(screen.queryByText('Sin cargo')).not.toBeInTheDocument(); expect(screen.getByText('En cualquier momento')).toBeInTheDocument();
    expect(screen.getByText('US$ 460.00')).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Actualizar selección' }));
    expect(screen.getByRole('button', { name: 'Mi Selección (1)' })).toBeInTheDocument();
    view.rerender(<PublicAvailabilityPage initialCriteria={criteria} />);
    const card = await screen.findByRole('article', { name: 'Deluxe King' });
    expect(within(card).getByLabelText('Tarifa de Deluxe King')).toHaveValue('rp_non_refundable');
    expect(within(card).getByText('US$ 130.00')).toBeInTheDocument();
    view.rerender(<PublicRoomDetailPage roomTypeId="rt_deluxe_king" initialCriteria={criteria} />);
    await loaded(); expect(screen.getByLabelText('Plan de tarifa')).toHaveValue('rp_non_refundable');
    expect(screen.queryByText('Sin cargo')).not.toBeInTheDocument();
  });
  it('requires dates and does not request availability for incomplete criteria', async () => {
    const request = vi.fn(); mockServer.use(http.get('*/api/v1/public/availability', () => { request(); return HttpResponse.json({}); }));
    mount({ initialCriteria: {} }); expect(screen.getByRole('region', { name: 'Indica las fechas de tu estancia' })).toBeInTheDocument();
    await act(async () => {}); expect(request).not.toHaveBeenCalled(); expect(screen.queryByRole('button', { name: 'Seleccionar habitación' })).not.toBeInTheDocument();
  });
  it('changes dates in place, preserves promo and discards the previous selection', async () => {
    const replace = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
    mount({ initialCriteria: { ...criteria, promoCode: 'BOUTIQUE' } }); await loaded();
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar habitación' }));
    fireEvent.click(screen.getByRole('button', { name: 'Modificar fechas y huéspedes' }));
    fireEvent.change(screen.getByLabelText(/fecha de salida/i), { target: { value: '2026-10-15' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Buscar Disponibilidad' })); });
    await loaded();
    expect(replace).toHaveBeenCalledWith(null, '', '/habitaciones/rt_deluxe_king?checkIn=2026-10-10&checkOut=2026-10-15&adults=2&children=0&roomsCount=1&promoCode=BOUTIQUE');
    expect(screen.getByRole('complementary', { name: 'Tu estadía' })).toHaveTextContent('5 noches');
    expect(screen.getByRole('button', { name: 'Seleccionar habitación' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Abrir mi selección (0)' })).toBeInTheDocument();
  });
  it('shows missing room and does not invent a quote or a physical room', async () => {
    mount({ roomTypeId: 'rt_unknown' }); expect(await screen.findByRole('region', { name: 'Habitación no disponible' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Seleccionar habitación' })).not.toBeInTheDocument();
  });
  it('does not silently replace an unavailable requested rate', async () => {
    mount({ initialRatePlanId: 'rp_missing' }); await loaded(); expect(screen.getByRole('alert')).toHaveTextContent('La tarifa seleccionada ya no está disponible');
    expect(screen.queryByRole('button', { name: 'Seleccionar habitación' })).not.toBeInTheDocument();
  });
  it('does not invent charges or structured penalties when optional metadata is absent', async () => {
    const room = publicCatalogueFixture.available_room_types[0];
    mockServer.use(http.get('*/api/v1/public/availability', () => HttpResponse.json({ ...publicCatalogueFixture, check_in_date: criteria.checkIn, check_out_date: criteria.checkOut,
      available_room_types: [{ ...room, rate_plans: room.rate_plans.map(rate => ({ ...rate, stay_price_breakdown: undefined, cancellation_terms: undefined })) }],
    })));
    mount(); await loaded(); expect(screen.getByText('Por confirmar')).toBeInTheDocument(); expect(screen.queryByText('Sin cargo')).not.toBeInTheDocument();
    expect(screen.getByText(/Hasta 72 h antes: sin cargo/)).toBeInTheDocument();
  });
  it('recovers from transport errors and offline state without losing criteria', async () => {
    onlineManager.setOnline(false); mount(); expect(screen.getByRole('alert')).toHaveTextContent('Sin conexión');
    await act(async () => { onlineManager.setOnline(true); }); await loaded();
    mockServer.use(http.get('*/api/v1/public/availability', () => new HttpResponse(null, { status: 500 })));
    await act(async () => { await clients[0].invalidateQueries({ queryKey: ['public-availability'] }); });
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos consultar esta habitación');
    expect(screen.queryByRole('button', { name: 'Seleccionar habitación' })).not.toBeInTheDocument();
  });
});
