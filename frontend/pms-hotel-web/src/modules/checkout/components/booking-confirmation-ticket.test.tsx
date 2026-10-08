import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DemoBookingConfirmation } from '@/modules/reservations';
import { emptyGuest } from '../domain/guest-details';
import { BookingConfirmationTicket } from './booking-confirmation-ticket';

const confirmation: DemoBookingConfirmation = { reservationId: 'HB-2026-8942', propertyId: 'prop_boutique_01', arrival: '2026-10-10', departure: '2026-10-13', confirmedAt: '2026-10-05T12:00:00Z', totalMinor: 50500, guaranteeMinor: 16833, remainingMinor: 33667, currency: 'USD', stays: [{ id: 'stay-1', roomTypeId: 'king', ratePlanId: 'flex', roomName: 'Deluxe King' }], guarantee: { paymentId: 'demo-pay', status: 'CAPTURED', amount: 168.33, currency: 'USD', providerReference: 'demo-psp', last4: '4242', cardBrand: 'Visa', createdAt: new Date('2026-10-05T12:00:00Z'), failureReason: null } };
const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor); else Reflect.deleteProperty(navigator, 'clipboard'); });
function mount(currency: 'USD' | 'GTQ' = 'USD') {
  return render(<BookingConfirmationTicket confirmation={confirmation} guest={{ ...emptyGuest, firstName: 'Carlos', lastName: 'Mendoza', email: 'guest@example.com' }} criteria={{ adults: 2, children: 1 }} currency={currency}/>);
}
describe('Confirmation ticket actions', () => {
  it('uses actual business IDs, formatted dates, guests, total and linked-reservation navigation', () => {
    mount('GTQ'); expect(screen.getByRole('heading', { name: 'HB-2026-8942' })).toBeInTheDocument(); expect(screen.getByText('10 oct 2026')).toBeInTheDocument(); expect(screen.getByText('13 oct 2026')).toBeInTheDocument(); expect(screen.getByText('2 adultos · 1 niño')).toBeInTheDocument(); expect(screen.getByText('Q 3,858.89')).toBeInTheDocument(); expect(screen.getByText('Estadía: stay-1')).toBeInTheDocument(); expect(screen.getByRole('link', { name: /Ver mis reservas/ })).toHaveAttribute('href', '/mis-reservas');
  });
  it('copies only the reservation reference and provides success or fallback feedback', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    mount(); fireEvent.click(screen.getByRole('button', { name: 'Copiar código' })); expect(await screen.findByRole('status')).toHaveTextContent('¡Código copiado'); expect(writeText).toHaveBeenCalledWith('HB-2026-8942'); writeText.mockRejectedValueOnce(new Error('permission denied')); fireEvent.click(screen.getByRole('button', { name: 'Copiar código' })); expect(await screen.findByText(/copiarlo manualmente/)).toBeInTheDocument();
  });
  it('opens browser print for PDF and downloads an explicitly requested calendar without storage', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined); const createObjectURL = vi.fn(() => 'blob:calendar-test'); const revokeObjectURL = vi.fn();
    class CalendarURL extends URL { static createObjectURL = createObjectURL; static revokeObjectURL = revokeObjectURL; }
    vi.stubGlobal('URL', CalendarURL); const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    mount(); fireEvent.click(screen.getByRole('button', { name: 'Imprimir / Guardar PDF' })); expect(print).toHaveBeenCalledOnce(); fireEvent.click(screen.getByRole('button', { name: 'Agregar al calendario (.ics)' })); expect(createObjectURL).toHaveBeenCalledOnce(); expect(click).toHaveBeenCalledOnce(); expect(await screen.findByRole('status')).toHaveTextContent('Calendario descargado'); expect(localStorage.length).toBe(0); expect(sessionStorage.length).toBe(0);
  });
});
