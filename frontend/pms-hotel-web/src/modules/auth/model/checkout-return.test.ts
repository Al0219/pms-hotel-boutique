import { describe, expect, it } from 'vitest';
import { checkoutReturn } from './checkout-return';
describe('Allowed Guest checkout return', () => {
  it('retains checkout search on the allowed local path', () => { expect(checkoutReturn('/reserva/checkout?checkIn=2026-10-10&adults=2')).toBe('/reserva/checkout?checkIn=2026-10-10&adults=2'); });
  it.each(['https://evil.test/reserva/checkout?a=1', '//evil.test', 'javascript:alert(1)', '/staff/habitaciones', '/reserva/checkout/../pago?a=1', '/reserva/checkout?a=1#fragment', '/reserva/checkout?x=1\n'])('rejects unsafe or unrelated return %s', value => { expect(checkoutReturn(value)).toBeUndefined(); });
});
