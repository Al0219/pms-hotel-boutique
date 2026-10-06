import { describe, expect, it } from 'vitest';
import { checkoutReturn, guestAccessReturn } from './checkout-return';
describe('Allowed Guest checkout return', () => {
  it('allows only the explicit reservation-history and linking entries in addition to checkout', () => {
    expect(guestAccessReturn('/mis-reservas')).toBe('/mis-reservas');
    expect(guestAccessReturn('/cuenta/reservas/vincular')).toBe('/cuenta/reservas/vincular');
    expect(guestAccessReturn('/cuenta/reservas/vincular?next=https://evil.test')).toBeUndefined();
    expect(guestAccessReturn('/cuenta/reservas/vincular#fragment')).toBeUndefined();
    expect(guestAccessReturn('/cuenta/reservas/vincular/../staff')).toBeUndefined();
    expect(guestAccessReturn('/mis-reservas?next=https://evil.test')).toBeUndefined();
    expect(guestAccessReturn('//evil.test/mis-reservas')).toBeUndefined();
  });
  it('retains checkout search on the allowed local path', () => { expect(checkoutReturn('/reserva/checkout?checkIn=2026-10-10&adults=2')).toBe('/reserva/checkout?checkIn=2026-10-10&adults=2'); });
  it.each(['https://evil.test/reserva/checkout?a=1', '//evil.test', 'javascript:alert(1)', '/staff/habitaciones', '/reserva/checkout/../pago?a=1', '/reserva/checkout?a=1#fragment', '/reserva/checkout?x=1\n'])('rejects unsafe or unrelated return %s', value => { expect(checkoutReturn(value)).toBeUndefined(); });
});
