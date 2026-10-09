import { usePublicAvailability } from '@/modules/availability';
import { PublicGlobalCart } from './public-global-cart';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/data/mocks/server';
import { backendAvailability, publicPropertyId, publicRoomTypeId } from '@/test/public-availability-fixture';
import { PublicBookingProvider, usePublicBookingSession } from '../components/public-booking-provider';
import { PublicBookingHome } from './public-booking-home';
import { PublicAvailabilityPage } from './public-availability-page';
import { PublicRoomDetailPage } from './public-room-detail-page';
import { PublicBookingReviewPage } from './public-booking-review-page';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
const criteria = { checkIn: '2026-11-01', checkOut: '2026-11-03', adults: 2, children: 0, roomsCount: 1 };
const clients: QueryClient[] = [];
beforeEach(() => {
  push.mockClear(); vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false'); vi.stubEnv('NEXT_PUBLIC_PROPERTY_ID', publicPropertyId);
  vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://spring.invalid');
  mockServer.use(http.get('*/api/v1/public/availability', () => HttpResponse.json(backendAvailability)));
});
afterEach(() => { clients.splice(0).forEach(client => client.clear()); vi.unstubAllEnvs(); });
function CartEvidence() { const { cart } = usePublicBookingSession(); return <output data-testid="cart-evidence">{JSON.stringify(cart)}</output>; }
function mount(node: React.ReactNode = <PublicAvailabilityPage initialCriteria={criteria} />) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clients.push(client);
  return render(node, { wrapper: ({ children }) => <QueryClientProvider client={client}><PublicBookingProvider><PublicGlobalCart />{children}<CartEvidence /></PublicBookingProvider></QueryClientProvider> });
}

describe('Public real availability journey', () => {
  it('preserves Backend UUIDs, demo plan, prices and Property through catalogue, detail and /reserva selection', async () => {
    const requests: Request[] = [];
    // Deliberately different total: the UI must render the Backend quote, not nightly × nights.
    const response = { ...backendAvailability, offers: [{ ...backendAvailability.offers[0], totalMinor: 123456 }] };
    mockServer.use(http.get('*/api/v1/public/availability', ({ request }) => { requests.push(request); return HttpResponse.json(response); }));
    const view = mount();
    const card = await screen.findByRole('article', { name: 'Deluxe real' });
    expect(card).toHaveTextContent('Q 850.00'); expect(card).toHaveTextContent('Q 1,234.56'); expect(card).toHaveTextContent('Capacidad por confirmar');
    expect(screen.queryByLabelText('Mostrar precios en')).not.toBeInTheDocument();
    const link = within(card).getByRole('link', { name: 'Ver detalles' });
    expect(link.getAttribute('href')).toContain(`/habitaciones/${publicRoomTypeId}?`);
    expect(link.getAttribute('href')).toContain('ratePlanId=DEMO_DELUXE');
    fireEvent.click(within(card).getByRole('button', { name: 'Agregar al carrito' }));
    expect(JSON.parse(screen.getByTestId('cart-evidence').textContent!)).toMatchObject({ propertyId: publicPropertyId,
      items: [{ roomTypeId: publicRoomTypeId, ratePlanId: 'DEMO_DELUXE', quantity: 1 }] });
    view.rerender(<PublicRoomDetailPage roomTypeId={publicRoomTypeId} initialCriteria={criteria} initialRatePlanId="DEMO_DELUXE" />);
    await screen.findByRole('heading', { name: 'Deluxe real', level: 1 });
    expect(screen.queryByLabelText('Plan de tarifa')).not.toBeInTheDocument();
    expect(JSON.parse(screen.getByTestId('cart-evidence').textContent!).items[0]).toMatchObject({ratePlanId:'DEMO_DELUXE',ratePlanCode:'DEMO_DELUXE'});
    expect(screen.getByRole('complementary', { name: 'Tu estadía' })).toHaveTextContent('Q 1,234.56');
    expect(screen.queryByText('Por confirmar')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Revisar mi selección' }));
    expect(push).toHaveBeenCalledWith('/reserva?checkIn=2026-11-01&checkOut=2026-11-03&adults=2&children=0&roomsCount=1');
    view.rerender(<PublicBookingReviewPage initialCriteria={criteria} />);
    const review = await screen.findByRole('article', { name: 'Deluxe real' });
    expect(review).toHaveTextContent('DEMO_DELUXE');
    expect(screen.getByRole('complementary', { name: 'Resumen de precio' })).toHaveTextContent('Q 1,234.56');
    expect(JSON.parse(screen.getByTestId('cart-evidence').textContent!).items).toEqual([expect.objectContaining({ roomTypeId: publicRoomTypeId, roomTypeCode: 'DLX', ratePlanId: 'DEMO_DELUXE', quantity: 1, currency: 'GTQ', nightlyRateMinor: 85000, totalMinor: 123456 })]);
    expect(requests.length).toBeGreaterThanOrEqual(2);
    for (const request of requests) {
      expect(new URL(request.url).searchParams.get('propertyId')).toBe(publicPropertyId);
      expect(new URL(request.url).origin).toBe(window.location.origin);
      expect(request.headers.has('authorization')).toBe(false);
    }
  });
  it('renders offers=[] as the normal empty state', async () => {
    mockServer.use(http.get('*/api/v1/public/availability', () => HttpResponse.json({ ...backendAvailability, offers: [] })));
    mount(); expect(await screen.findByRole('region', { name: 'Sin habitaciones disponibles' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it.each([[400, 'Revisa los criterios de búsqueda'], [404, 'Propiedad no disponible'], [500, 'No pudimos consultar disponibilidad'], [503, 'No pudimos consultar disponibilidad']])('shows recoverable %s without demo offers', async (status, title) => {
    mockServer.use(http.get('*/api/v1/public/availability', () => HttpResponse.json({}, { status: status as number })));
    mount(); expect(await screen.findByRole('alert')).toHaveTextContent(title as string);
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });
  it('requires configured Property instead of querying with a fictitious ID', async () => {
    vi.stubEnv('NEXT_PUBLIC_PROPERTY_ID', '');
    const request = vi.fn(); mockServer.use(http.get('*/api/v1/public/availability', () => { request(); return HttpResponse.json(backendAvailability); }));
    mount(); await screen.findByRole('alert'); expect(request).not.toHaveBeenCalled();
  });
  it('recovers from a network error by retrying the same real search', async () => {
    mockServer.use(http.get('*/api/v1/public/availability', () => HttpResponse.error()));
    mount(); expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectar');
    mockServer.use(http.get('*/api/v1/public/availability', () => HttpResponse.json(backendAvailability)));
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/i }));
    expect(await screen.findByRole('article', { name: 'Deluxe real' })).toHaveTextContent('Q 1,700.00');
  });
  it('rejects response identity mismatches rather than selecting another Property', async () => {
    mockServer.use(http.get('*/api/v1/public/availability', () => HttpResponse.json({ ...backendAvailability, propertyId: publicRoomTypeId })));
    mount(); await screen.findByRole('alert'); expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });
  it('does not expose mock capacity, exchange rates or commercial filters in real mode', async () => {
    mount(); await screen.findByRole('article', { name: 'Deluxe real' });
    expect(screen.queryByRole('button', { name: '2+' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Conversión indicativa/)).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'DLX' })).toBeInTheDocument();
    expect(screen.getByRole('article')).not.toHaveTextContent('2 huéspedes');
  });
});

it('homepage renders Backend IDs and quoted GTQ prices instead of fixture USD conversions', async () => {
  const view = mount(<PublicBookingHome initialCriteria={criteria} />);
  const card = await screen.findByRole('article', { name: 'Deluxe real' });
  expect(card).toHaveTextContent('Q 850.00'); expect(card).toHaveTextContent('Q 1,700.00');
  expect(within(card).getByRole('link', { name: 'Ver habitación' })).toHaveAttribute('href', expect.stringContaining(`${publicRoomTypeId}?`));
  expect(within(card).getByRole('link')).toHaveAttribute('href', expect.stringContaining('ratePlanId=DEMO_DELUXE'));
  expect(screen.queryByText('Deluxe King')).not.toBeInTheDocument(); expect(screen.queryByLabelText('Mostrar precios en')).not.toBeInTheDocument();
  view.rerender(<PublicBookingHome initialCriteria={{ checkIn: '', checkOut: '' }} />);
  expect(await screen.findByText(/Elige tus fechas/)).toBeInTheDocument(); expect(screen.queryByRole('article')).not.toBeInTheDocument();
});

it('Carrito preserves one real item, caps increments and removes at 1→0', async () => {
  mount(); const card = await screen.findByRole('article', { name: 'Deluxe real' });
  fireEvent.click(within(card).getByRole('button', { name: 'Agregar al carrito' }));
  fireEvent.click(screen.getByRole('button', { name: 'Carrito' }));
  const cart = screen.getByRole('dialog', { name: 'Carrito' });
  const plus = await within(cart).findByRole('button', { name: 'Aumentar cantidad de Deluxe real' });
  await waitFor(()=>expect(plus).toBeEnabled());
  fireEvent.click(plus); expect(plus).toBeDisabled();
  expect(JSON.parse(screen.getByTestId('cart-evidence').textContent!).items).toEqual([expect.objectContaining({ roomTypeId: publicRoomTypeId, ratePlanId: 'DEMO_DELUXE', quantity: 2, totalMinor: 170000 })]);
  fireEvent.click(within(cart).getByRole('button', { name: 'Reducir cantidad de Deluxe real' })); expect(plus).toBeEnabled();
  fireEvent.click(within(cart).getByRole('button', { name: 'Reducir cantidad de Deluxe real' }));
  expect(cart).toHaveTextContent('Tu carrito está vacío'); expect(JSON.parse(screen.getByTestId('cart-evidence').textContent!).items).toEqual([]);
});

it('real code, price and ordering filters keep the selection and query source intact', async () => {
  const requests = vi.fn(); const secondId = '42ec66c1-2d0b-40e5-bccf-a6dc3acfe1d6';
  mockServer.use(http.get('*/api/v1/public/availability', () => { requests(); return HttpResponse.json({ ...backendAvailability, offers: [...backendAvailability.offers, { ...backendAvailability.offers[0], roomTypeId: secondId, roomTypeCode: 'STD', roomTypeName: 'Standard real', ratePlanId: 'DEMO_STANDARD', ratePlanCode: 'DEMO_STANDARD', nightlyRateMinor: 65000, totalMinor: 130000 }] }); }));
  mount(); const deluxe = await screen.findByRole('article', { name: 'Deluxe real' });
  fireEvent.click(within(deluxe).getByRole('button', { name: 'Agregar al carrito' }));
  expect(within(screen.getByRole('article', { name: 'Standard real' })).getByRole('button', { name: 'Agregar al carrito' })).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(screen.getByRole('checkbox', { name: 'STD' })); expect(screen.getAllByRole('article')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
  fireEvent.change(screen.getByLabelText('Precio máximo por noche'), { target: { value: '65000' } }); expect(screen.getAllByRole('article')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
  fireEvent.change(screen.getByLabelText('Ordenar por'), { target: { value: 'price-asc' } }); expect(screen.getAllByRole('article')[0]).toHaveAccessibleName('Standard real');
  fireEvent.change(screen.getByLabelText('Ordenar por'), { target: { value: 'price-desc' } }); expect(screen.getAllByRole('article')[0]).toHaveAccessibleName('Deluxe real');
  expect(requests).toHaveBeenCalledTimes(1); expect(JSON.parse(screen.getByTestId('cart-evidence').textContent!).items).toHaveLength(1);
});

it('keeps all six confirmed offers through Response → DTO → mapper → hook → catalogue and Home', async () => {
  const codes = ['CLASSIC', 'DLX', 'KING', 'STD', 'SUITE', 'TWIN'];
  const dto = { ...backendAvailability, offers: codes.map((code, index) => {
    const nightly = code === 'SUITE' ? 120000 : code === 'DLX' ? 85000 : 65000;
    const plan = code === 'SUITE' ? 'DEMO_SUITE' : code === 'DLX' ? 'DEMO_DELUXE' : 'DEMO_STANDARD';
    return { ...backendAvailability.offers[0], roomTypeId: `${index + 1}1111111-1111-3111-8111-111111111111`,
      roomTypeCode: code, roomTypeName: `Real ${code}`, ratePlanId: plan, ratePlanCode: plan,
      availableUnits: code === 'STD' ? 5 : 4, nightlyRateMinor: nightly, totalMinor: nightly * 2 };
  }) };
  const snapshot = structuredClone(dto);
  const requests: Request[] = [];
  mockServer.use(http.get('*/api/v1/public/availability', ({ request }) => {
    requests.push(request); return HttpResponse.json(dto);
  }));
  function HookEvidence() {
    const query = usePublicAvailability({ checkInDate: criteria.checkIn, checkOutDate: criteria.checkOut, adults: 2, children: 0, roomsCount: 1 });
    return <output data-testid="availability-trace">{JSON.stringify({ status: query.status, count: query.data?.roomTypes.length,
      rooms: query.data?.roomTypes.map(room => ({ id: room.roomTypeId, capacity: room.maxOccupancy, rate: room.ratePlans[0].totalMinor })) })}</output>;
  }
  const view = mount(<><PublicAvailabilityPage initialCriteria={criteria} /><HookEvidence /></>);
  await screen.findByRole('article', { name: 'Real TWIN' });
  expect(screen.getAllByRole('article')).toHaveLength(6);
  expect(JSON.parse(screen.getByTestId('availability-trace').textContent!)).toEqual({ status: 'success', count: 6,
    rooms: dto.offers.map(offer => ({ id: offer.roomTypeId, capacity: null, rate: offer.totalMinor })) });
  expect(requests.length).toBeGreaterThan(0);
  expect(new URL(requests[0].url).searchParams.get('propertyId')).toBe(publicPropertyId);
  expect(screen.queryByText('Sin habitaciones disponibles')).not.toBeInTheDocument();
  view.rerender(<PublicBookingHome initialCriteria={criteria} />);
  await screen.findByRole('article', { name: 'Real CLASSIC' });
  expect(screen.getAllByRole('article')).toHaveLength(6);
  expect(dto).toEqual(snapshot);
});
