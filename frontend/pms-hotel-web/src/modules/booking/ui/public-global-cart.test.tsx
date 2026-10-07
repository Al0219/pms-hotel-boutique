import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/data/mocks/server';
import { sixRoomAvailability } from '@/test/public-six-room-fixture';
import { PublicBookingProvider } from '../components/public-booking-provider';
import { publicCartStorageKey, readStoredCart } from '../domain/public-cart-storage';
import { PublicAvailabilityPage } from './public-availability-page';
import { PublicBookingHome } from './public-booking-home';
import { PublicBookingShell } from './public-booking-shell';
const push = vi.hoisted(() => vi.fn()); let pathname = '/habitaciones';
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }), usePathname: () => pathname }));
vi.mock('@/modules/auth', () => ({ useGuestSession: () => ({ account: null }) }));
const criteria = { checkIn: '2026-11-01', checkOut: '2026-11-03', adults: 2, children: 0, roomsCount: 1 };
const clients: QueryClient[] = [];
beforeEach(() => { pathname='/habitaciones'; push.mockClear(); vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API','false'); vi.stubEnv('NEXT_PUBLIC_PROPERTY_ID',sixRoomAvailability.propertyId); mockServer.use(http.get('*/api/v1/public/availability', () => HttpResponse.json(sixRoomAvailability))); });
afterEach(() => { clients.splice(0).forEach(client => client.clear()); vi.unstubAllEnvs(); });
function mount(node = <PublicAvailabilityPage initialCriteria={criteria} />) {
  const client = new QueryClient({ defaultOptions: { queries: { retry:false,gcTime:0 } } }); clients.push(client);
  return render(node, { wrapper: ({ children }) => <QueryClientProvider client={client}><PublicBookingProvider><PublicBookingShell>{children}</PublicBookingShell></PublicBookingProvider></QueryClientProvider> });
}
describe('Public header cart and six real rooms', () => {
  it('homepage shows six real names, real GTQ quotes and UUID/DEMO plan links', async () => {
    mount(<PublicBookingHome initialCriteria={criteria} />);
    await screen.findByRole('article',{name:'Habitación Estándar'}); expect(screen.getAllByRole('article')).toHaveLength(6);
    for (const offer of sixRoomAvailability.offers) {
      const card=screen.getByRole('article',{name:offer.roomTypeName});
      expect(within(card).getByRole('link',{name:'Ver habitación'})).toHaveAttribute('href',expect.stringContaining(offer.roomTypeId));
      expect(within(card).getByRole('link',{name:'Ver habitación'})).toHaveAttribute('href',expect.stringContaining(`ratePlanId=${offer.ratePlanId}`));
    }
    expect(screen.getByRole('article',{name:'Habitación Deluxe'})).toHaveTextContent('Q 850.00'); expect(screen.getByRole('article',{name:'Suite'})).toHaveTextContent('Q 2,400.00');
    expect(screen.queryByText('Deluxe King')).not.toBeInTheDocument(); expect(screen.queryByText(/Créditos de fotografías|Fotografías ilustrativas/)).not.toBeInTheDocument(); expect(screen.getByRole('button',{name:'Carrito'})).toHaveTextContent('0');
  });
  it('preserves separate UUID selections, max ATS, session reload and navigation through login', async () => {
    const view=mount(); const standard=await screen.findByRole('article',{name:'Habitación Estándar'});
    fireEvent.click(within(standard).getByRole('button',{name:'Agregar al carrito'}));
    expect(within(screen.getByRole('article',{name:'Habitación Classic'})).getByRole('button',{name:'Agregar al carrito'})).toHaveAttribute('aria-pressed','false');
    fireEvent.click(screen.getByRole('button',{name:'Carrito'}));
    const dialog=screen.getByRole('dialog',{name:'Carrito'}); const plus=await within(dialog).findByRole('button',{name:'Aumentar cantidad de Habitación Estándar'});
    await waitFor(() => expect(plus).toBeEnabled()); fireEvent.click(plus); fireEvent.click(plus); fireEvent.click(plus); expect(plus).toBeDisabled();
    expect(readStoredCart(sessionStorage.getItem(publicCartStorageKey(false)),false).items[0]).toMatchObject({roomTypeId:sixRoomAvailability.offers[0].roomTypeId,ratePlanId:'DEMO_STANDARD',quantity:4});
    fireEvent.click(within(dialog).getByRole('button',{name:'Seguir explorando'}));
    pathname='/acceso'; view.rerender(<p>Acceso Guest</p>); expect(screen.queryByRole('button',{name:'Carrito'})).not.toBeInTheDocument();
    pathname='/'; view.rerender(<PublicBookingHome initialCriteria={criteria} />); expect(screen.getByRole('button',{name:'Carrito'})).toHaveTextContent('4');
    view.unmount(); const reloaded=mount(<PublicBookingHome initialCriteria={criteria} />);
    expect(screen.getByRole('button',{name:'Carrito'})).toHaveTextContent('4'); fireEvent.click(screen.getByRole('button',{name:'Carrito'}));
    const second=screen.getByRole('dialog',{name:'Carrito'}); const minus=await within(second).findByRole('button',{name:'Reducir cantidad de Habitación Estándar'});
    await waitFor(() => expect(minus).toBeEnabled()); for(let i=0;i<4;i++) fireEvent.click(minus);
    expect(second).toHaveTextContent('Tu carrito está vacío'); expect(screen.getByRole('link',{name:'Habitaciones'})).toHaveAttribute('href','/?checkIn=2026-11-01&checkOut=2026-11-03&adults=2&children=0&roomsCount=1#habitaciones'); expect(readStoredCart(sessionStorage.getItem(publicCartStorageKey(false)),false).items).toEqual([]); reloaded.unmount();
  });
});
