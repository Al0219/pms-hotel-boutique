import { useEffect, type ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/data/mocks/server';
import { publicCatalogueFixture } from '@/data/mocks/public-catalogue';
import { PublicBookingProvider, usePublicBookingSession } from '../components/public-booking-provider';
import { buildSearchQueryParams, type BookingSearchCriteria } from '../domain/booking-search-criteria';
import { PublicBookingReviewPage } from './public-booking-review-page';
import { PublicRoomDetailPage } from './public-room-detail-page';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
const criteria = { checkIn: '2026-10-10', checkOut: '2026-10-13', adults: 2, children: 0, roomsCount: 1, promoCode: 'BOUTIQUE' };
const defaultSelection = [{ roomTypeId: 'rt_deluxe_king', ratePlanId: 'rp_flexible', quantity: 1 }];
const clients: QueryClient[] = [];
beforeEach(() => { push.mockClear(); vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-05T12:00:00Z')); vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://pms.test'); vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true'); });
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); onlineManager.setOnline(true); vi.useRealTimers(); vi.unstubAllEnvs(); });
function mount(initialCriteria: Partial<BookingSearchCriteria> = criteria, seed = defaultSelection, child?: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clients.push(client);
  function Seed({ children }: { children: ReactNode }) {
    const { setCart } = usePublicBookingSession();
    useEffect(() => { setCart({ scope: Object.values(initialCriteria).some(value=>value!==undefined) ? `prop_boutique_01:${buildSearchQueryParams(criteria)}` : '', propertyId: 'prop_boutique_01', items: seed }); }, [setCart]);
    return children;
  }
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}><PublicBookingProvider><Seed>{children}</Seed></PublicBookingProvider></QueryClientProvider>;
  return render(child ?? <PublicBookingReviewPage initialCriteria={initialCriteria} />, { wrapper });
}

describe('Public booking selection review', () => {
  it('transitions from detail into review with selected plan, criteria and GTQ, then continues to guest data', async () => {
    const view = mount(criteria, [], <PublicRoomDetailPage roomTypeId="rt_deluxe_king" initialCriteria={criteria} />);
    await screen.findByRole('heading', { name: 'Deluxe King', level: 1 });
    fireEvent.change(screen.getByLabelText('Mostrar precios en'), { target: { value: 'GTQ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar habitación' }));
    expect(push).toHaveBeenCalledWith('/reserva?checkIn=2026-10-10&checkOut=2026-10-13&adults=2&children=0&roomsCount=1&promoCode=BOUTIQUE');
    view.rerender(<PublicBookingReviewPage initialCriteria={criteria} />);
    const price = await screen.findByRole('complementary', { name: 'Resumen de precio' });
    expect(price).toHaveTextContent('Q 3,858.89'); expect(screen.getByLabelText('Mostrar precios en')).toHaveValue('GTQ');
    expect(screen.getByRole('link', { name: /Cambiar habitación/ })).toHaveAttribute('href', '/habitaciones?checkIn=2026-10-10&checkOut=2026-10-13&adults=2&children=0&roomsCount=1&promoCode=BOUTIQUE');
    fireEvent.click(screen.getByRole('button', { name: /Continuar con mis datos/ }));
    expect(push).toHaveBeenLastCalledWith('/reserva/checkout?checkIn=2026-10-10&checkOut=2026-10-13&adults=2&children=0&roomsCount=1&promoCode=BOUTIQUE');
  });
  it('queries the selected property, shows the four-step process and exact server estimate', async () => {
    const properties: (string | null)[] = [];
    mockServer.use(http.get('*/api/v1/public/availability', ({ request }) => { properties.push(new URL(request.url).searchParams.get('property_id')); return HttpResponse.json({ ...publicCatalogueFixture, check_in_date: criteria.checkIn, check_out_date: criteria.checkOut }); }));
    mount(); const price = await screen.findByRole('complementary', { name: 'Resumen de precio' });
    expect(properties).toContain('prop_boutique_01');
    for (const amount of ['Q 3,323.99', 'Q 168.11', 'Q 366.79', 'Q 3,858.89']) expect(within(price).getByText(amount)).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Pasos de la reserva' }).querySelector('[aria-current="step"]')).toHaveTextContent('Revisa tu selección');
    expect(within(screen.getByRole('navigation', { name: 'Pasos de la reserva' })).getAllByRole('listitem')).toHaveLength(4);
    expect(screen.queryByText('La disponibilidad se verificará nuevamente antes de confirmar la reserva.')).not.toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Deluxe King' })).toHaveTextContent('3 noches');
  });
  it('retains multiple selections and applies quantities to fee totals', async () => {
    mount(criteria, [...defaultSelection.map(value => ({ ...value, quantity: 2 })), { roomTypeId: 'rt_terrace_suite', ratePlanId: 'rp_terrace', quantity: 1 }]);
    const price = await screen.findByRole('complementary', { name: 'Resumen de precio' });
    expect(screen.getAllByRole('article')).toHaveLength(2); expect(price).toHaveTextContent('3 habitaciones');
    expect(within(price).getByText('Q 13,066.73')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continuar con mis datos/ })).toBeEnabled();
  });
  it.each([{ ...defaultSelection[0], ratePlanId: 'rp_missing' }, { ...defaultSelection[0], quantity: 3 }])('blocks a stale rate or ATS quantity instead of silently replacing it: %o', async selection => {
    mount(criteria, [selection]);
    await screen.findByRole('complementary', { name: 'Resumen de precio' });
    expect(screen.getByRole('button', { name: /Continuar con mis datos/ })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('ya no está disponible');
    expect(screen.getByText('Por confirmar')).toBeInTheDocument();
  });
  it('uses current quotes after availability changes and does not fabricate missing fees', async () => {
    mockServer.use(http.get('*/api/v1/public/availability', () => HttpResponse.json({ ...publicCatalogueFixture, check_in_date: criteria.checkIn, check_out_date: criteria.checkOut,
      available_room_types: publicCatalogueFixture.available_room_types.map(room => ({ ...room, rate_plans: room.rate_plans.map(rate => ({ ...rate, total_amount: '499.00', stay_price_breakdown: undefined })) })),
    })));
    mount(); const price = await screen.findByRole('complementary', { name: 'Resumen de precio' });
    expect(within(price).getByText('Q 3,813.04')).toBeInTheDocument(); expect(within(price).getByText('Por confirmar')).toBeInTheDocument();
    expect(within(price).queryByText('Q 3,858.89')).not.toBeInTheDocument();
  });
  it('shows an empty selection after removal', async () => {
    mount(); await screen.findByRole('article', { name: 'Deluxe King' });
    fireEvent.click(screen.getByRole('button', { name: 'Quitar Deluxe King' }));
    expect(screen.getByRole('region', { name: 'Tu selección está vacía' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Continuar con mis datos/ })).not.toBeInTheDocument();
  });
  it('retains the accepted search and selection when navigating to an older/different query', async () => {
    const view = mount(); await screen.findByRole('article', { name: 'Deluxe King' });
    view.rerender(<PublicBookingReviewPage initialCriteria={{ ...criteria, checkOut: '2026-10-14' }} />);
    expect(await screen.findByRole('article', { name: 'Deluxe King' })).toHaveTextContent('3 noches');
    expect(screen.getByRole('button', { name: /Continuar con mis datos/ })).toBeEnabled();
    expect(screen.getByRole('link', {name:'← Volver a resultados'})).toHaveAttribute('href',expect.stringContaining('checkOut=2026-10-13'));
  });
  it('rejects availability from a property other than the selected property', async () => {
    mockServer.use(http.get('*/api/v1/public/availability', () => HttpResponse.json({ ...publicCatalogueFixture, property_id: 'prop_other', check_in_date: criteria.checkIn, check_out_date: criteria.checkOut })));
    mount(); expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos verificar tu selección');
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });
  it('does not query incomplete criteria or manufacture a selection for direct entry', async () => {
    const request = vi.fn(); mockServer.use(http.get('*/api/v1/public/availability', () => { request(); return HttpResponse.json({}); }));
    mount({}, []); expect(screen.getByRole('region', { name: 'Completa tu búsqueda' })).toBeInTheDocument();
    await act(async () => {}); expect(request).not.toHaveBeenCalled();
  });
  it('recovers from offline and transport failure without claiming availability is held', async () => {
    onlineManager.setOnline(false); mount(); expect(screen.getByRole('alert')).toHaveTextContent('Sin conexión');
    mockServer.use(http.get('*/api/v1/public/availability', () => new HttpResponse(null, { status: 500 })));
    await act(async () => { onlineManager.setOnline(true); });
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos verificar tu selección');
    mockServer.resetHandlers(); fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('complementary', { name: 'Resumen de precio' })).toHaveTextContent('Q 3,858.89');
  });
});
