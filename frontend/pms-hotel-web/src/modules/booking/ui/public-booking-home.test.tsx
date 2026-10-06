import { act, cleanup, fireEvent, render as rtlRender, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { PublicBookingProvider } from '../components/public-booking-provider';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicBookingHome } from './public-booking-home';
import { PublicBookingShell } from './public-booking-shell';
import type { GuestAccount } from '@/modules/auth';

const push = vi.fn();
const replace = vi.fn();
let guestAccount: GuestAccount | null = null;
let pathname = '/';
const router = { push, replace };
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => pathname }));
vi.mock('@/modules/auth', () => ({ useGuestSession: () => ({ account: guestAccount }) }));
const criteria = { checkIn: '2026-10-10', checkOut: '2026-10-15', adults: 2, children: 0, roomsCount: 1 };
const render = (ui: ReactElement) => rtlRender(ui, { wrapper: PublicBookingProvider });
beforeEach(() => { pathname = '/'; guestAccount = null; vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-04T12:00:00Z')); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

describe('Public 01 landing interactions', () => {
  it('uses a distraction-free header only on the Guest access route', () => {
    pathname = '/acceso';
    const view = render(<PublicBookingShell><p>Acceso</p></PublicBookingShell>);
    const header = within(screen.getByRole('banner'));
    expect(header.getByRole('link', { name: 'Hotel Boutique, inicio' })).toHaveAttribute('href', '/');
    expect(header.getByRole('link', { name: '← Volver al inicio' })).toHaveAttribute('href', '/');
    expect(header.queryByRole('navigation')).not.toBeInTheDocument();
    expect(header.queryByRole('button', { name: 'Menú' })).not.toBeInTheDocument();
    expect(header.queryByRole('link', { name: 'Iniciar sesión' })).not.toBeInTheDocument();
    pathname = '/habitaciones';
    view.rerender(<PublicBookingShell><p>Catálogo</p></PublicBookingShell>);
    expect(header.getByRole('navigation', { name: 'Navegación pública' })).toBeInTheDocument();
    expect(header.getByRole('link', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });
  it('preserves bookmarked criteria when submitting the compact search', () => {
    render(<PublicBookingHome initialCriteria={{ ...criteria, roomsCount: 2, promoCode: 'PROMO' }} />);
    expect(screen.getByLabelText(/^Check-in/)).toHaveValue(criteria.checkIn);
    fireEvent.click(screen.getByRole('button', { name: 'Buscar disponibilidad' }));
    expect(push).toHaveBeenCalledWith('/habitaciones?checkIn=2026-10-10&checkOut=2026-10-15&adults=2&children=0&roomsCount=2&promoCode=PROMO');
  });
  it('edits guests and rooms and restores focus when the disclosure is closed', () => {
    render(<PublicBookingHome initialCriteria={criteria} />);
    const toggle = screen.getByRole('button', { name: 'Huéspedes 2 adultos' });
    expect(screen.queryByRole('spinbutton', { name: /^Adultos/ })).not.toBeInTheDocument();
    fireEvent.click(toggle);
    fireEvent.change(screen.getByRole('spinbutton', { name: /^Adultos/ }), { target: { value: '4' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: /^Habitaciones/ }), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Listo' }));
    expect(toggle).toHaveFocus();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Buscar disponibilidad' }));
    expect(push).toHaveBeenCalledWith(expect.stringContaining('adults=4&children=0&roomsCount=2'));
  });
  it('reveals and focuses invalid occupancy even after the panel has been closed', async () => {
    render(<PublicBookingHome initialCriteria={criteria} />);
    const toggle = screen.getByRole('button', { name: 'Huéspedes 2 adultos' });
    fireEvent.click(toggle);
    fireEvent.change(screen.getByRole('spinbutton', { name: /^Habitaciones/ }), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Listo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Buscar disponibilidad' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(screen.getByRole('spinbutton', { name: /^Habitaciones/ })).toHaveFocus());
    expect(push).not.toHaveBeenCalled();
  });
  it('links editorial rooms to their RoomType details with the active search', () => {
    render(<PublicBookingHome initialCriteria={criteria} />);
    const link = within(screen.getByRole('article', { name: 'Suite Terraza' })).getByRole('link', { name: 'Ver habitación' });
    expect(link).toHaveAttribute('href', '/habitaciones/rt_terrace_suite?checkIn=2026-10-10&checkOut=2026-10-15&adults=2&children=0&roomsCount=1');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('defaults to quetzales and lets visitors switch to dollars and back', () => {
    render(<PublicBookingHome initialCriteria={criteria} />);
    const room = screen.getByRole('article', { name: 'Deluxe King' });
    expect(screen.getByLabelText('Mostrar precios en')).toHaveValue('GTQ');
    expect(within(room).getByText('Q 1,108.00')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Mostrar precios en'), { target: { value: 'USD' } });
    expect(within(room).getByText('US$ 145.00')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Mostrar precios en'), { target: { value: 'GTQ' } });
    expect(within(room).getByText('Q 1,108.00')).toBeInTheDocument();
    expect(screen.getByText(/Referencia 2026-10-04/)).toBeInTheDocument();
  });
  it('uses existing Guest routes and closes the mobile menu with Escape', () => {
    render(<PublicBookingShell><p>Contenido público</p></PublicBookingShell>);
    const navigation = screen.getByRole('navigation', { name: 'Navegación pública' });
    expect(within(navigation).getByRole('link', { name: 'Habitaciones' })).toHaveAttribute('href', '/habitaciones');
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/acceso');
    expect(within(navigation).queryByRole('link', { name: 'Iniciar sesión' })).not.toBeInTheDocument();
    expect(within(navigation).getByRole('link', { name: 'Mis reservas' })).toHaveAttribute('href', '/acceso?returnTo=%2Fmis-reservas');
    const toggle = screen.getByRole('button', { name: /Menú/ });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(navigation, { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
  });
  it('does not present provisional legal information as an approved hotel policy', () => {
    render(<PublicBookingShell><p>Contenido público</p></PublicBookingShell>);
    const privacy = screen.getByRole('button', { name: 'Política de privacidad' });
    fireEvent.click(privacy);
    expect(screen.getByRole('dialog', { name: 'Política de privacidad' })).toHaveTextContent('pendiente de publicación');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(privacy).toHaveFocus();
  });
  it('keeps navigation public and directs signed-in Guests to their linked reservations', () => {
    const view = render(<PublicBookingShell><p>Contenido público</p></PublicBookingShell>);
    expect(screen.getByRole('link', { name: 'Mis reservas' })).toHaveAttribute('href', '/acceso?returnTo=%2Fmis-reservas');
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/acceso');
    guestAccount = { id: 'guest-demo', email: 'demo@example.com', externalIdentities: [] };
    view.rerender(<PublicBookingShell><p>Contenido público</p></PublicBookingShell>);
    const navigation = screen.getByRole('navigation', { name: 'Navegación pública' });
    expect(within(navigation).getByRole('link', { name: 'Mis reservas' })).toHaveAttribute('href', '/mis-reservas');
    expect(screen.getByRole('link', { name: 'Mi cuenta' })).toHaveAttribute('href', '/cuenta');
    expect(screen.queryByRole('link', { name: 'Iniciar sesión' })).not.toBeInTheDocument();
    guestAccount = null;
    view.rerender(<PublicBookingShell><p>Contenido público</p></PublicBookingShell>);
    expect(screen.getByRole('link', { name: 'Mis reservas' })).toHaveAttribute('href', '/acceso?returnTo=%2Fmis-reservas');
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/acceso');
  });
  it('keeps customer-facing footer copy and opens social and FAQ information', () => {
    render(<PublicBookingShell><p>Contenido público</p></PublicBookingShell>);
    expect(screen.queryByRole('button', { name: 'Datos de demostración' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Instagram' }));
    expect(screen.getByRole('dialog', { name: 'Instagram' })).toHaveTextContent('Descubre nuestras habitaciones');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preguntas frecuentes (FAQ)' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Para consultar tus reservas necesitas acceder');
  });
  it('shows floating search only after the original scrolls above the viewport and uses the current draft', () => {
    let notify!: (intersecting: boolean, top: number) => void;
    const disconnect = vi.fn();
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback) {
        notify = (isIntersecting, top) => callback([{
          isIntersecting, boundingClientRect: new DOMRect(0, top, 500, 100),
        } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      }
      observe() {}
      disconnect = disconnect;
    });
    const view = render(<PublicBookingHome initialCriteria={criteria} />);
    act(() => notify(false, 900));
    expect(screen.queryByRole('complementary', { name: 'Búsqueda flotante' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^Check-out/), { target: { value: '2026-10-18' } });
    fireEvent.click(screen.getByRole('button', { name: 'Huéspedes 2 adultos' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: /^Adultos/ }), { target: { value: '3' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: /^Habitaciones/ }), { target: { value: '2' } });
    act(() => notify(false, -200));
    const floating = screen.getByRole('complementary', { name: 'Búsqueda flotante' });
    expect(floating).toHaveTextContent('18 oct');
    expect(floating).toHaveTextContent('3 adultos · 2 hab.');
    fireEvent.click(within(floating).getByRole('button', { name: 'Buscar' }));
    expect(push).toHaveBeenCalledWith('/habitaciones?checkIn=2026-10-10&checkOut=2026-10-18&adults=3&children=0&roomsCount=2');
    act(() => notify(true, 200));
    expect(screen.queryByRole('complementary', { name: 'Búsqueda flotante' })).not.toBeInTheDocument();
    view.unmount();
    expect(disconnect).toHaveBeenCalled();
  });
  it('keeps malformed bookmarked dates editable without crashing the floating summary', () => {
    render(<PublicBookingHome initialCriteria={{ ...criteria, checkIn: 'invalid-date' }} />);
    expect(screen.getByRole('heading', { name: /Encuentra una estadía/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Buscar disponibilidad' }));
    expect(screen.getByLabelText(/^Check-in/)).toHaveAttribute('aria-invalid', 'true');
    expect(push).not.toHaveBeenCalled();
  });
});
