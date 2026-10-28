import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/data/mocks/server';
import { PublicReservationLookup } from './public-reservation-lookup';
const path = '*/api/public/reservation-lookup/search', id = '11111111-1111-4111-8111-111111111111', stay = '22222222-2222-4222-8222-222222222222';
const row = { reservationId: id, stayId: stay, confirmationCode: 'REAL-LOOKUP', propertyName: 'Hotel Boutique', reservationStatus: 'CONFIRMED', arrival: '2036-01-01', departure: '2036-01-03', roomCode: null, status: 'RESERVED' };
const detail = { id: stay, reservationId: id, roomType: { id, name: 'Deluxe King' }, room: null, arrival: row.arrival, departure: row.departure, status: 'RESERVED' };
const payload = { stays: [row], details: [detail], overview: { createdAt: '2026-10-28T12:00:00Z', source: 'WEB_DIRECTA', currency: 'GTQ', confirmedTotalMinor: 65000 }, accommodations: [{ stayId: stay, roomTypeCode: 'CLASSIC', timezone: 'America/Guatemala' }] };
beforeEach(() => { mockServer.use(http.post(path, () => HttpResponse.json(payload))); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); Reflect.deleteProperty(navigator, 'clipboard'); });
function fill() {
  fireEvent.change(screen.getByLabelText('Correo utilizado al reservar'), { target: { value: 'guest@example.test' } });
  fireEvent.change(screen.getByLabelText('Código de reserva'), { target: { value: 'REAL-LOOKUP' } });
}
async function consult() {
  fill(); fireEvent.click(screen.getByRole('button', { name: 'Consultar reserva' }));
  await screen.findByText('Reserva encontrada · Consulta de lectura');
}
it('looks up one reservation using both credentials, without email code or login', async () => {
  const request = vi.fn(async ({ request }: { request: Request }) => { expect(await request.json()).toEqual({ email: 'guest@example.test', confirmationCode: 'REAL-LOOKUP' }); return HttpResponse.json(payload); });
  mockServer.use(http.post(path, request));
  render(<PublicReservationLookup />); await consult();
  expect(request).toHaveBeenCalledOnce();
  expect(screen.getByRole('heading', { name: 'REAL-LOOKUP' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Fotografías de Deluxe King' })).toBeInTheDocument();
  expect(screen.getByText('Q 650.00')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Fotografía siguiente' }));
  expect(screen.getByRole('button', { name: 'Ver fotografía 2' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('heading', { name: 'Deluxe King' })).toBeInTheDocument();
  expect(screen.queryByLabelText('Código de verificación')).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'REAL-LOOKUP' })).not.toBeInTheDocument();
});
it('keeps the whole history behind account access and validates both fields with focus', () => {
  render(<PublicReservationLookup />);
  expect(screen.getByRole('link', { name: 'Crear cuenta o iniciar sesión' })).toHaveAttribute('href', '/acceso?returnTo=%2Fmis-reservas');
  fireEvent.click(screen.getByRole('button', { name: 'Consultar reserva' }));
  expect(screen.getByLabelText('Correo utilizado al reservar')).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByLabelText('Correo utilizado al reservar')).toHaveFocus();
  expect(screen.getByLabelText('Código de reserva')).toHaveAttribute('aria-invalid', 'true');
});
it('uses a generic message when either credential is incorrect', async () => {
  mockServer.use(http.post(path, () => new HttpResponse(null, { status: 404 })));
  render(<PublicReservationLookup />); fill(); fireEvent.click(screen.getByRole('button', { name: 'Consultar reserva' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No encontramos una reserva con ese correo y código');
  expect(screen.getByLabelText('Correo utilizado al reservar')).toHaveValue('guest@example.test');
  expect(screen.queryByText('Reserva encontrada · Consulta de lectura')).not.toBeInTheDocument();
});
it('shows request limits and retains the form without exposing previous results', async () => {
  render(<PublicReservationLookup />); await consult();
  fireEvent.click(screen.getByRole('button', { name: 'Consultar otra reserva' }));
  expect(screen.getByLabelText('Correo utilizado al reservar')).toHaveValue('');
  expect(screen.getByLabelText('Código de reserva')).toHaveValue('');
  mockServer.use(http.post(path, () => new HttpResponse(null, { status: 429 })));
  fill(); fireEvent.click(screen.getByRole('button', { name: 'Consultar reserva' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('límite de consultas');
  expect(screen.queryByRole('heading', { name: 'REAL-LOOKUP' })).not.toBeInTheDocument();
});
it('blocks repeated submissions while searching', async () => {
  let resolve!: () => void;
  const pending = new Promise<void>(done => { resolve = done; });
  const request = vi.fn(async () => { await pending; return HttpResponse.json(payload); });
  mockServer.use(http.post(path, request));
  render(<PublicReservationLookup />); fill();
  const button = screen.getByRole('button', { name: 'Consultar reserva' });
  fireEvent.click(button); fireEvent.click(button);
  await waitFor(() => expect(request).toHaveBeenCalledOnce());
  expect(screen.getByRole('button', { name: 'Consultando reserva…' })).toBeDisabled();
  await act(async () => { resolve(); });
  await screen.findByText('Reserva encontrada · Consulta de lectura');
});
it('clears private results on close, reload/remount and after fifteen minutes', async () => {
  const mounted = render(<PublicReservationLookup />); await consult();
  vi.useFakeTimers(); vi.setSystemTime(Date.now() + 900001); act(() => { fireEvent.focus(window); }); vi.useRealTimers();
  expect(screen.queryByRole('heading', { name: 'REAL-LOOKUP' })).not.toBeInTheDocument();
  await consult(); mounted.unmount();
  render(<PublicReservationLookup />);
  expect(screen.queryByRole('heading', { name: 'REAL-LOOKUP' })).not.toBeInTheDocument();
  expect(screen.getByLabelText('Correo utilizado al reservar')).toHaveValue('');
});

it('shows every reserved room and handles unknown catalog photos without inventing them', async () => {
  mockServer.use(http.post(path, () => HttpResponse.json({ ...payload,
    stays: [row, { ...row, stayId: 'another-stay', arrival: '2036-01-02' }],
    details: [detail, { ...detail, id: 'another-stay', arrival: '2036-01-02', roomType: { id: 'another-type', name: 'Suite sin fotos' } }],
    accommodations: [...payload.accommodations, { stayId: 'another-stay', roomTypeCode: 'UNKNOWN', timezone: 'America/Guatemala' }],
  })));
  render(<PublicReservationLookup />); await consult();
  expect(screen.getByText('2 habitaciones')).toBeInTheDocument();
  expect(screen.getByText('Fechas detalladas en cada habitación')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Deluxe King' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Suite sin fotos' })).toBeInTheDocument();
  expect(screen.getByText('Fotografías próximamente')).toBeInTheDocument();
});
it('never shows an invented price or zero when no historical confirmation amount exists', async () => {
  mockServer.use(http.post(path, () => HttpResponse.json({ ...payload, overview: { ...payload.overview, confirmedTotalMinor: null } })));
  render(<PublicReservationLookup />); await consult();
  expect(screen.getByText(/No hay un importe de confirmación disponible/)).toBeInTheDocument();
  expect(screen.queryByText(/Q 0.00/)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Ver en dólares/ })).not.toBeInTheDocument();
});
it('displays the original amount, supports currency display, copying and printing the summary', async () => {
  const copy = vi.fn(async () => undefined), print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: copy } });
  render(<PublicReservationLookup />); await consult();
  expect(screen.getByText('Sitio web del hotel')).toBeInTheDocument();
  expect(screen.getByText('guest@example.test')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Ver en dólares (US$)' }));
  expect(screen.getByText(/^US\$/)).toBeInTheDocument();
  expect(screen.getByText(/Importe original: Q 650.00/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Copiar código de reserva' }));
  await waitFor(() => expect(copy).toHaveBeenCalledWith('REAL-LOOKUP'));
  expect(await screen.findByText('Código copiado al portapapeles.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Imprimir / Guardar PDF' })); expect(print).toHaveBeenCalledOnce();
});
