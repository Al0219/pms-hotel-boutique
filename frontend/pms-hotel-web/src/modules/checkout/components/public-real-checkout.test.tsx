import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/data/mocks/server';
import { GuestSessionProvider } from '@/modules/auth';
import { PublicGlobalCart, PublicBookingProvider, PublicAvailabilityPage, PublicBookingReviewPage } from '@/modules/booking';
import { backendAvailability, publicPropertyId } from '@/test/public-availability-fixture';
import { CheckoutDraftProvider } from './checkout-draft-provider';
import { PublicGuestDataPage } from './public-guest-data-page';
import { PublicCheckoutReviewPage } from './public-checkout-review-page';
import { PublicPaymentReviewPage } from './public-payment-review-page';

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
const criteria = { checkIn: '2026-11-01', checkOut: '2026-11-03', adults: 2, children: 0, roomsCount: 1 };
const clients: QueryClient[] = [];
beforeEach(() => {
  push.mockClear(); vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false'); vi.stubEnv('NEXT_PUBLIC_PROPERTY_ID', publicPropertyId);
  mockServer.use(http.get('*/api/auth/guest/session', () => new HttpResponse(null, { status: 401 })), http.get('*/api/v1/public/availability', () => HttpResponse.json(backendAvailability)));
});
afterEach(() => { clients.splice(0).forEach(client => client.clear()); vi.unstubAllEnvs(); });
async function prepare(quantity = 1, multiple = false) {
  if (multiple) mockServer.use(http.get('*/api/v1/public/availability', () => HttpResponse.json({ ...backendAvailability, offers: [...backendAvailability.offers, { ...backendAvailability.offers[0], roomTypeId: '23ec66c1-2d0b-40e5-bccf-a6dc3acfe1d6', roomTypeCode: 'STD', roomTypeName: 'Standard real', ratePlanId: 'DEMO_STANDARD', ratePlanCode: 'DEMO_STANDARD', nightlyRateMinor: 65000, totalMinor: 130000 }] })));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clients.push(client);
  const view = render(<PublicAvailabilityPage initialCriteria={criteria} />, { wrapper: ({ children }) => <QueryClientProvider client={client}><GuestSessionProvider><PublicBookingProvider><PublicGlobalCart /><CheckoutDraftProvider>{children}</CheckoutDraftProvider></PublicBookingProvider></GuestSessionProvider></QueryClientProvider> });
  const card = await screen.findByRole('article', { name: 'Deluxe real' });
  fireEvent.click(within(card).getByRole('button', { name: 'Agregar al carrito' }));
  if (multiple) fireEvent.click(within(screen.getByRole('article', { name: 'Standard real' })).getByRole('button', { name: 'Agregar al carrito' }));
  if (quantity === 2) {
    fireEvent.click(screen.getByRole('button', { name: /^Carrito/ }));
    const plus=await screen.findByRole('button', { name: 'Aumentar cantidad de Deluxe real' }); await waitFor(()=>expect(plus).toBeEnabled()); fireEvent.click(plus);
    fireEvent.click(screen.getByRole('button', { name: 'Seguir explorando' }));
  }
  view.rerender(<PublicGuestDataPage initialCriteria={criteria} />); await screen.findByLabelText('Nombre *');
  return view;
}
function fill() {
  for (const [label, value] of [['Nombre *', ' María José '], ['Apellidos *', "O’Neill-Pérez"], ['Correo electrónico *', ' GUEST@EXAMPLE.COM '], ['Teléfono *', '55555555'], ['Documento de identificación *', ' DOC-1234 ']]) fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
async function approve() {
  fireEvent.submit(screen.getByLabelText('Nombre *').closest('form')!);
  await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining('/checkout/revision?')));
}
describe('Real checkout presentation up to Payment', () => {
  it.each([[1, false, 'Q 1,700.00'], [2, false, 'Q 3,400.00'], [2, true, 'Q 4,700.00']])('accepts GTQ quantity %i with multiple=%s and preserves state on every back link', async (quantity, multiple, total) => {
    const writes = vi.fn(); mockServer.use(http.post('*', ({request}) => { if(new URL(request.url).pathname==='/api/auth/guest/refresh')return new HttpResponse(null,{status:401});writes();return HttpResponse.json({}); }));
    const view = await prepare(quantity, multiple); fill();
    const back = screen.getByRole('link', { name: /Volver al carrito/ }); expect(back).toHaveAttribute('href', expect.stringContaining('/reserva?'));
    view.rerender(<PublicBookingReviewPage initialCriteria={criteria} />);
    expect(await screen.findByRole('article', { name: 'Deluxe real' })).toHaveTextContent('DEMO_DELUXE');
    view.rerender(<PublicGuestDataPage initialCriteria={criteria} />); expect(await screen.findByLabelText('Nombre *')).toHaveValue(' María José ');
    await approve(); view.rerender(<PublicCheckoutReviewPage initialCriteria={criteria} />);
    const summary = await screen.findByRole('complementary', { name: 'Total de la reserva' });
    expect(summary).toHaveTextContent(total as string); expect(summary).toHaveTextContent('Alojamiento');
    expect(summary).not.toHaveTextContent(/Impuestos|Cargo de servicio|Pendiente|Por confirmar/);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Volver a datos' })).toHaveAttribute('href', expect.stringContaining('/checkout?'));
    expect(within(screen.getByRole('navigation', { name: 'Pasos de la reserva' })).getAllByRole('link')).toHaveLength(2);
    const next = screen.getByRole('button', { name: /Continuar al pago/ }); expect(next).toBeEnabled(); fireEvent.click(next);
    view.rerender(<PublicPaymentReviewPage initialCriteria={criteria} />);
    expect(await screen.findByRole('complementary', { name: 'Resumen de la reserva' })).toHaveTextContent(total as string);
    expect(screen.getByText('María José O’Neill-Pérez')).toBeInTheDocument(); expect(screen.getByText('guest@example.com')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Volver a revisión' })).toHaveAttribute('href', expect.stringContaining('/checkout/revision?'));
    expect(screen.getByRole('button', { name: 'Garantizar y confirmar reserva' })).toBeDisabled();
    expect(screen.queryByTitle('Formulario de tarjeta')).not.toBeInTheDocument(); expect(screen.queryByText(/cotización está incompleta/)).not.toBeInTheDocument();
    view.rerender(<PublicCheckoutReviewPage initialCriteria={criteria} />); expect(await screen.findByRole('button', { name: /Continuar al pago/ })).toBeEnabled();
    view.rerender(<PublicGuestDataPage initialCriteria={criteria} />); expect(await screen.findByLabelText('Nombre *')).toHaveValue('María José'); expect(screen.getByLabelText('Documento de identificación *')).toHaveValue('DOC-1234');
    expect(writes).not.toHaveBeenCalled();
  });
  it('shows accessible field errors and prevents bad input advancing', async () => {
    await prepare(); fill();
    fireEvent.change(screen.getByLabelText('Nombre *'), { target: { value: 'Carlos123' } });
    fireEvent.change(screen.getByLabelText('Apellidos *'), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText('Correo electrónico *'), { target: { value: 'invalid' } });
    fireEvent.change(screen.getByLabelText('Teléfono *'), { target: { value: '5555555' } });
    fireEvent.change(screen.getByLabelText('Documento de identificación *'), { target: { value: '' } });
    fireEvent.submit(screen.getByLabelText('Nombre *').closest('form')!);
    expect(screen.getByLabelText('Nombre *')).toHaveFocus();
    for (const label of ['Nombre *', 'Apellidos *', 'Correo electrónico *', 'Teléfono *', 'Documento de identificación *']) {
      expect(screen.getByLabelText(label)).toHaveAttribute('aria-invalid', 'true'); expect(screen.getByLabelText(label)).toHaveAccessibleDescription();
    }
    expect(screen.getByText(/exactamente 8 dígitos/)).toBeInTheDocument(); expect(screen.getByText('Ingresa tu documento de identificación.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Teléfono *'), { target: { value: 'abc' } }); expect(screen.getByLabelText('Teléfono *')).toHaveValue('5555555'); expect(screen.getByText('Ingresa solo dígitos en el teléfono.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Documento de identificación *'), { target: { value: 'DOC/123' } }); expect(screen.getByLabelText('Documento de identificación *')).toHaveAttribute('aria-invalid', 'true');
    expect(push).not.toHaveBeenCalled();
  });
});

it('uses the exact approved Guest HTML maxima, country-specific phone limit and requests counter', async () => {
  await prepare();
  for (const [label,maximum] of [['Nombre *',50],['Apellidos *',60],['Correo electrónico *',120],['Teléfono *',8],['Documento de identificación *',25],['Solicitudes especiales',250]] as const) expect(screen.getByLabelText(label)).toHaveAttribute('maxlength',String(maximum));
  for (const label of ['Nombre *','Apellidos *','Correo electrónico *','Teléfono *','Documento de identificación *','País / región *']) expect(screen.getByLabelText(label)).toBeRequired();
  expect(screen.getByLabelText('Caracteres de solicitudes especiales')).toHaveTextContent('0/250');
  fireEvent.change(screen.getByLabelText('Código de país del teléfono'),{target:{value:'+1'}}); expect(screen.getByLabelText('Teléfono *')).toHaveAttribute('maxlength','15');
});
