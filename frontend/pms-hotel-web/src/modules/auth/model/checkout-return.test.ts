import { describe, expect, it } from 'vitest';
import { checkoutReturn, guestAccessReturn } from './checkout-return';
describe('Allowed Guest checkout return', () => {
  it('allows only the explicit reservation-history and linking entries in addition to checkout', () => {
    expect(guestAccessReturn('/mis-reservas')).toBe('/mis-reservas');
    expect(guestAccessReturn('/cuenta/reservas/vincular')).toBe('/cuenta/reservas/vincular');
    for (const route of ['/cuenta', '/cuenta/reservas', '/cuenta/historial']) expect(guestAccessReturn(route)).toBe(route);
    expect(guestAccessReturn('/cuenta/reservas?accountId=other')).toBeUndefined();
    expect(guestAccessReturn('/cuenta/historial#fragment')).toBeUndefined();
    expect(guestAccessReturn('/cuenta/reservas/vincular?next=https://evil.test')).toBeUndefined();
    expect(guestAccessReturn('/cuenta/reservas/vincular#fragment')).toBeUndefined();
    expect(guestAccessReturn('/cuenta/reservas/vincular/../staff')).toBeUndefined();
    expect(guestAccessReturn('/mis-reservas?next=https://evil.test')).toBeUndefined();
    expect(guestAccessReturn('//evil.test/mis-reservas')).toBeUndefined();
  });
  it('preserves only a UUID detail path without identity overrides or arbitrary account routes', () => {
    const detail = '/cuenta/reservas/33333333-3333-4333-8333-333333333333';
    expect(guestAccessReturn(detail)).toBe(detail);
    for (const route of [`${detail}?accountId=other`, `${detail}#fragment`, '/cuenta/reservas/bad-id', '/cuenta/staff']) expect(guestAccessReturn(route)).toBeUndefined();
  });
  it('retains checkout search on the allowed local path', () => { expect(checkoutReturn('/reserva/checkout?checkIn=2026-10-10&adults=2')).toBe('/reserva/checkout?checkIn=2026-10-10&adults=2'); });
  it.each(['https://evil.test/reserva/checkout?a=1', '//evil.test', 'javascript:alert(1)', '/staff/habitaciones', '/reserva/checkout/../pago?a=1', '/reserva/checkout?a=1#fragment', '/reserva/checkout?x=1\n'])('rejects unsafe or unrelated return %s', value => { expect(checkoutReturn(value)).toBeUndefined(); });
});
