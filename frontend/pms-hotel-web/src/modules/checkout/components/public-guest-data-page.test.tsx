import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/data/mocks/server';
import { PublicBookingProvider, PublicRoomDetailPage } from '@/modules/booking';
import { PublicGuestDataPage } from './public-guest-data-page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
const criteria = { checkIn: '2026-10-10', checkOut: '2026-10-13', adults: 2, children: 0, roomsCount: 1 };
const clients: QueryClient[] = [];
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-05T12:00:00Z')); vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://pms.test'); vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true'); });
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.useRealTimers(); vi.unstubAllEnvs(); });
function mount(detail = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clients.push(client);
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}><PublicBookingProvider>{children}</PublicBookingProvider></QueryClientProvider>;
  return render(detail ? <PublicRoomDetailPage roomTypeId="rt_deluxe_king" initialCriteria={criteria} /> : <PublicGuestDataPage initialCriteria={criteria} />, { wrapper });
}
describe('Initial guest data destination', () => {
  it('requires a current selection and preserves search in the return link', async () => {
    mount(); expect(await screen.findByRole('region', { name: 'Revisa tu selección antes de continuar' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Nombre completo')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Volver a mi selección/ })).toHaveAttribute('href', '/reserva?checkIn=2026-10-10&checkOut=2026-10-13&adults=2&children=0&roomsCount=1');
  });
  it('accepts guest contact locally without creating accounts, reservations or payments', async () => {
    const mutations = vi.fn(); mockServer.use(http.post('*', () => { mutations(); return HttpResponse.json({}); }));
    const view = mount(true); await screen.findByRole('heading', { name: 'Deluxe King', level: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar habitación' }));
    view.rerender(<PublicGuestDataPage initialCriteria={criteria} />);
    const name = await screen.findByLabelText('Nombre completo');
    expect(screen.getByText(/Puedes continuar como invitado/)).toBeInTheDocument();
    expect(name).toHaveAttribute('autocomplete', 'name');
    fireEvent.change(name, { target: { value: '   ' } });
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'guest@example.com' } });
    fireEvent.submit(name.closest('form')!); expect(screen.queryByRole('status')).not.toBeInTheDocument();
    fireEvent.change(name, { target: { value: 'Huésped Demo' } }); fireEvent.submit(name.closest('form')!);
    expect(screen.getByRole('status')).toHaveTextContent('Datos revisados');
    expect(screen.getByRole('status')).toHaveTextContent('todavía no se creó una reserva');
    expect(mutations).not.toHaveBeenCalled();
    expect(sessionStorage.length).toBe(0);
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'different@example.com' } });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
  it('does not show the form when availability fails', async () => {
    mockServer.use(http.get('*/api/v1/public/availability', () => new HttpResponse(null, { status: 500 })));
    mount(); expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos verificar tu selección');
    expect(screen.queryByLabelText('Correo electrónico')).not.toBeInTheDocument();
  });
});
