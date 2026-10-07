import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BookingStepper } from './booking-stepper';
const criteria = { checkIn: '2026-11-01', checkOut: '2026-11-03', adults: 2, children: 0, roomsCount: 1 };
describe('Booking previous-step navigation', () => {
  it('links only completed previous steps while keeping the current and future steps inert', () => {
    const view = render(<BookingStepper step={3} completed={1} criteria={criteria} />);
    const navigation = screen.getByRole('navigation', { name: 'Pasos de la reserva' });
    expect(within(navigation).getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Revisa tu selección' })).toHaveAttribute('href', expect.stringContaining('/reserva?'));
    expect(screen.queryByRole('link', { name: 'Datos del huésped' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Pago y garantía' })).not.toBeInTheDocument();
    view.rerender(<BookingStepper step={4} completed={3} criteria={criteria} />);
    expect(within(navigation).getAllByRole('link')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Revisa y confirma' })).toHaveAttribute('href', expect.stringContaining('/checkout/revision?'));
    expect(screen.queryByRole('link', { name: 'Pago y garantía' })).not.toBeInTheDocument();
  });
});
