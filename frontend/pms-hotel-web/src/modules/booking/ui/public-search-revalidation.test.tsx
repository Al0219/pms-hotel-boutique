import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { delay, http, HttpResponse } from 'msw';
import { mockServer } from '@/data/mocks/server';
import { sixRoomAvailability } from '@/test/public-six-room-fixture';
import { PublicBookingProvider, usePublicBookingSession } from '../components/public-booking-provider';
import { PublicBookingShell } from './public-booking-shell';
import { PublicAvailabilityPage } from './public-availability-page';
import { PublicRoomDetailPage } from './public-room-detail-page';
import { PublicBookingHome } from './public-booking-home';
import { PublicBookingReviewPage } from './public-booking-review-page';

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }), usePathname: () => '/habitaciones' }));
vi.mock('@/modules/auth', () => ({ useGuestSession: () => ({ account: null }) }));
const criteria = { checkIn: '2026-11-01', checkOut: '2026-11-03', adults: 2, children: 0, roomsCount: 1 };
const clients: QueryClient[] = [];
let failure: 'ats' | 'missing' | 'network' | 'none' = 'none';
let slow = false;
const requests: URL[] = [];
beforeEach(() => {
  failure = 'none'; slow = false; requests.length = 0; push.mockClear();
  vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false'); vi.stubEnv('NEXT_PUBLIC_PROPERTY_ID', sixRoomAvailability.propertyId);
  mockServer.use(http.get('*/api/v1/public/availability', async ({ request }) => {
    const url = new URL(request.url); requests.push(url); const departure = url.searchParams.get('departure')!;
    if (slow) await delay(150);
    if (departure !== criteria.checkOut && failure === 'network') return HttpResponse.error();
    let offers = sixRoomAvailability.offers.map(offer => ({ ...offer, totalMinor: departure === criteria.checkOut ? offer.totalMinor : offer.totalMinor + 100001, availableUnits: departure === criteria.checkOut ? 4 : 3 }));
    if (departure !== criteria.checkOut && failure === 'missing') offers = offers.filter(offer => offer.roomTypeCode !== 'SUITE');
    if (departure !== criteria.checkOut && failure === 'ats') offers[0].availableUnits = 1;
    if (Number(url.searchParams.get('rooms')) > 4) offers = [];
    return HttpResponse.json({ ...sixRoomAvailability, arrival: url.searchParams.get('arrival'), departure, offers });
  }));
});
afterEach(() => { clients.splice(0).forEach(client => client.clear()); vi.unstubAllEnvs(); });
function Evidence() { const { cart } = usePublicBookingSession(); return <output data-testid="cart">{JSON.stringify(cart)}</output>; }
function cart() { return JSON.parse(screen.getByTestId('cart').textContent!); }
function mount(node = <PublicAvailabilityPage initialCriteria={criteria} />) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clients.push(client);
  return render(node, { wrapper: ({ children }) => <QueryClientProvider client={client}><PublicBookingProvider><PublicBookingShell>{children}</PublicBookingShell><Evidence /></PublicBookingProvider></QueryClientProvider> });
}
async function select(suite = false, quantity = 1) {
  const card = await screen.findByRole('article', { name: 'Habitación Estándar' });
  fireEvent.click(within(card).getByRole('button', { name: 'Agregar al carrito' }));
  if (suite) fireEvent.click(within(screen.getByRole('article', { name: 'Suite' })).getByRole('button', { name: 'Agregar al carrito' }));
  if (quantity > 1) {
    fireEvent.click(screen.getByRole('button', { name: 'Carrito' }));
    const plus = await screen.findByRole('button', { name: 'Aumentar cantidad de Habitación Estándar' });
    await waitFor(() => expect(plus).toBeEnabled()); fireEvent.click(plus); fireEvent.click(screen.getByRole('button', { name: 'Seguir explorando' }));
  }
}
function edit() {
  fireEvent.click(screen.getByRole('button', { name: 'Modificar fechas y huéspedes' }));
  fireEvent.change(screen.getByLabelText(/Fecha de Salida/), { target: { value: '2026-11-05' } });
}
describe('Integrated public search editing with a canonical cart', () => {
  it('opens the shared results editor with current values and accepts an empty-cart search', async () => {
    mount(); await screen.findByRole('article', { name: 'Habitación Estándar' });
    expect(screen.queryByRole('region', { name: 'Editor de búsqueda' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Modificar búsqueda' }));
    expect(screen.getByRole('region', { name: 'Editor de búsqueda' })).toBeVisible();
    expect(screen.getByLabelText(/Fecha de Llegada/)).toHaveFocus();
    expect(screen.getByLabelText(/Fecha de Salida/)).toHaveValue(criteria.checkOut);
    expect(screen.getByLabelText(/^Adultos/)).toHaveValue(2);
    expect(screen.getByLabelText(/^Niños/)).toHaveValue(0);
    expect(screen.getByLabelText(/^Habitaciones/)).toHaveValue(1);
    fireEvent.change(screen.getByLabelText(/Fecha de Llegada/), { target: { value: '2026-11-02' } });
    fireEvent.change(screen.getByLabelText(/Fecha de Salida/), { target: { value: '2026-11-05' } });
    fireEvent.change(screen.getByLabelText(/^Adultos/), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText(/^Niños/), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(/^Habitaciones/), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar Disponibilidad' }));
    await waitFor(() => expect(cart().scope).toContain('checkIn=2026-11-02&checkOut=2026-11-05&adults=4&children=2&roomsCount=2'));
    expect(cart().items).toEqual([]);
    expect(requests.some(url => url.searchParams.get('arrival') === '2026-11-02' && url.searchParams.get('rooms') === '2')).toBe(true);
    expect(screen.getByRole('link', { name: 'Habitaciones' })).toHaveAttribute('href', '/?checkIn=2026-11-02&checkOut=2026-11-05&adults=4&children=2&roomsCount=2#habitaciones');
    expect(await screen.findByRole('article', { name: 'Suite' })).toBeInTheDocument();
  });
  it('rejects invalid fields in results before consulting availability', async () => {
    mount(); await select(); const before = cart();
    fireEvent.click(screen.getByRole('button', { name: 'Modificar búsqueda' }));
    const count = requests.length;
    for (const [label, value] of [[/Fecha de Salida/, criteria.checkIn], [/^Adultos/, '0'], [/^Niños/, '-1'], [/^Habitaciones/, '0']] as const) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
    fireEvent.click(screen.getByRole('button', { name: 'Buscar Disponibilidad' }));
    for (const label of [/Fecha de Salida/, /^Adultos/, /^Niños/, /^Habitaciones/]) expect(screen.getByLabelText(label)).toHaveAttribute('aria-invalid', 'true');
    expect(requests).toHaveLength(count); expect(cart()).toEqual(before);
  });
  it.each(['ats', 'missing', 'network'] as const)('results rejects %s atomically and leaves every price and criterion intact', async reason => {
    mount(); await select(true, 2); const before = cart(); failure = reason;
    fireEvent.click(screen.getByRole('button', { name: 'Modificar búsqueda' }));
    fireEvent.change(screen.getByLabelText(/Fecha de Salida/), { target: { value: '2026-11-05' } });
    fireEvent.change(screen.getByLabelText(/^Habitaciones/), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar Disponibilidad' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(reason === 'network' ? 'No pudimos verificar' : reason === 'missing' ? 'Suite' : 'Hay 1 unidades');
    expect(cart()).toEqual(before);
    expect(screen.getByRole('link', { name: 'Habitaciones' })).toHaveAttribute('href', '/?checkIn=2026-11-01&checkOut=2026-11-03&adults=2&children=0&roomsCount=1#habitaciones');
  });
  it('results refreshes every selected line and Home reads the same accepted search', async () => {
    const view = mount(); await select(true, 2); const before = cart();
    fireEvent.click(screen.getByRole('button', { name: 'Modificar búsqueda' }));
    fireEvent.change(screen.getByLabelText(/Fecha de Salida/), { target: { value: '2026-11-05' } });
    fireEvent.change(screen.getByLabelText(/^Adultos/), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/^Niños/), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/^Habitaciones/), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar Disponibilidad' }));
    await waitFor(() => expect(cart().scope).toContain('checkOut=2026-11-05&adults=3&children=1&roomsCount=2'));
    expect(cart().items.map((item: { quantity: number }) => item.quantity)).toEqual([2, 1]);
    cart().items.forEach((item: { totalMinor: number; availableUnits: number; currency: string }, index: number) => {
      expect(item).toMatchObject({ totalMinor: before.items[index].totalMinor + 100001, availableUnits: 3, currency: 'GTQ' });
    });
    expect(screen.getByText('El precio de tu estancia se actualizó para las nuevas fechas.')).toHaveAttribute('role', 'status');
    view.rerender(<PublicBookingHome initialCriteria={criteria} />);
    expect(screen.getByLabelText(/^Check-out/)).toHaveValue('2026-11-05');
    expect(await screen.findByRole('article', { name: 'Suite' })).toHaveTextContent('Q 3,400.01');
    expect(document.getElementById('habitaciones')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Carrito' })).toHaveTextContent('3');
  });
  it('edits detail dates/guests/rooms atomically and updates every Backend quote, Header navigation and review', async () => {
    const view = mount(); await select(true, 2); const before = cart();
    view.rerender(<PublicRoomDetailPage roomTypeId={sixRoomAvailability.offers[0].roomTypeId} initialCriteria={criteria} />);
    await screen.findByRole('heading', { name: 'Habitación Estándar', level: 1 });
    expect(screen.queryByLabelText('Plan de tarifa')).not.toBeInTheDocument(); expect(screen.queryByText(/Créditos de fotografías/)).not.toBeInTheDocument();
    edit(); fireEvent.change(screen.getByLabelText(/^Adultos/), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText(/^Niños/), { target: { value: '2' } }); fireEvent.change(screen.getByLabelText(/^Habitaciones/), { target: { value: '2' } });
    expect(cart()).toEqual(before);
    fireEvent.click(screen.getByRole('button', { name: 'Buscar Disponibilidad' }));
    await waitFor(() => expect(cart().scope).toContain('checkOut=2026-11-05&adults=5&children=2&roomsCount=2'));
    expect(cart().items.map((item: { quantity: number }) => item.quantity)).toEqual([2, 1]);
    expect(cart().items[0]).toMatchObject({ availableUnits: 3, ratePlanId: 'DEMO_STANDARD', ratePlanCode: 'DEMO_STANDARD', totalMinor: 230001 });
    expect(screen.getByText('El precio de tu estancia se actualizó para las nuevas fechas.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Carrito' })).toHaveTextContent('3');
    expect(screen.getByRole('link', { name: 'Habitaciones' })).toHaveAttribute('href', expect.stringContaining('checkOut=2026-11-05&adults=5&children=2&roomsCount=2'));
    view.rerender(<PublicBookingReviewPage initialCriteria={criteria} />);
    expect(await screen.findByRole('complementary', { name: 'Resumen de precio' })).toHaveTextContent('Q 8,000.03');
    expect(cart().items[1].totalMinor).toBe(340001);
  }, 10000); // Several page transitions and live revalidation reads under the full suite.
  it.each(['missing', 'ats', 'network'] as const)('rejects %s without changing any old criteria/cart line or price', async reason => {
    const view = mount(); await select(true, 2); const before = cart();
    view.rerender(<PublicRoomDetailPage roomTypeId={sixRoomAvailability.offers[0].roomTypeId} initialCriteria={criteria} />);
    await screen.findByRole('heading', { name: 'Habitación Estándar', level: 1 }); failure = reason;
    edit(); fireEvent.click(screen.getByRole('button', { name: 'Buscar Disponibilidad' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(reason === 'network' ? 'No pudimos verificar' : reason === 'missing' ? 'Suite' : 'Hay 1 unidades');
    expect(cart()).toEqual(before); expect(screen.getByRole('complementary', { name: 'Tu estadía' })).toHaveTextContent('2 noches');
    expect(screen.getByRole('link', { name: 'Habitaciones' })).toHaveAttribute('href', expect.stringContaining('checkOut=2026-11-03'));
  });
  it('rejects a late validation result if the user changed the canonical cart meanwhile', async () => {
    const view = mount(); await select();
    view.rerender(<PublicRoomDetailPage roomTypeId={sixRoomAvailability.offers[0].roomTypeId} initialCriteria={criteria} />);
    await screen.findByRole('heading', { name: 'Habitación Estándar', level: 1 }); edit(); slow = true;
    fireEvent.click(screen.getByRole('button', {name:'Buscar Disponibilidad'}));
    fireEvent.click(screen.getByRole('button', {name:'Carrito'}));
    const remove = await screen.findByRole('button', {name:/^Quitar/}); fireEvent.click(remove);
    fireEvent.click(screen.getByRole('button', {name:'Seguir explorando'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Tu carrito cambió mientras verificábamos');
    expect(cart().items).toEqual([]); expect(cart().scope).toContain('checkOut=2026-11-03');
  });
  it('validates detail date and occupancy fields before any new request', async () => {
    const view = mount(); await select(); view.rerender(<PublicRoomDetailPage roomTypeId={sixRoomAvailability.offers[0].roomTypeId} initialCriteria={criteria} />);
    await screen.findByRole('heading', { name: 'Habitación Estándar', level: 1 }); edit(); const count = requests.length;
    fireEvent.change(screen.getByLabelText(/Fecha de Salida/), { target: { value: criteria.checkIn } });
    fireEvent.change(screen.getByLabelText(/^Adultos/), { target: { value: '0' } }); fireEvent.change(screen.getByLabelText(/^Niños/), { target: { value: '-1' } }); fireEvent.change(screen.getByLabelText(/^Habitaciones/), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar Disponibilidad' }));
    expect(screen.getByLabelText(/Fecha de Salida/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/^Adultos/)).toHaveAttribute('aria-invalid', 'true'); expect(requests).toHaveLength(count);
  });
  it('catalogue uses the same revalidation policy instead of deleting the cart', async () => {
    mount(); await select(true); const before = cart(); failure = 'missing';
    fireEvent.click(screen.getByRole('button', { name: 'Modificar búsqueda' }));
    fireEvent.change(screen.getByLabelText(/Fecha de Salida/), { target: { value: '2026-11-05' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar Disponibilidad' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Suite'); expect(cart()).toEqual(before);
    failure = 'none'; fireEvent.click(screen.getByRole('button', { name: 'Buscar Disponibilidad' }));
    await waitFor(() => expect(cart().scope).toContain('checkOut=2026-11-05'));
    expect(screen.getAllByRole('button', { name: 'Carrito' })).toHaveLength(1); expect(screen.getByRole('button', { name: 'Carrito' })).toHaveTextContent('2');
  });
  it('homepage search also preserves a selected cart on Backend failure', async () => {
    const view = mount(); await select(); const before = cart(); view.rerender(<PublicBookingHome initialCriteria={{}} />);
    failure = 'network'; fireEvent.change(screen.getByLabelText(/^Check-out/), { target: { value: '2026-11-05' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar disponibilidad' }));
    expect(await screen.findByText('No pudimos verificar la disponibilidad para las nuevas fechas. Tu selección anterior se conservó.')).toBeInTheDocument();
    expect(cart()).toEqual(before); expect(push).not.toHaveBeenCalled();
  });
  it('direct /habitaciones is a robust catalogue landing with a compact date search', async () => {
    mount(<PublicAvailabilityPage initialCriteria={{}} />);
    expect(screen.getByRole('heading', { name: 'Habitaciones', level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Check-in/)).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Buscar disponibilidad' })).toBeInTheDocument();
    expect(screen.queryByText('Reserva tu Estancia Exclusiva', { selector: 'h1' })).not.toBeInTheDocument();
  });
});
