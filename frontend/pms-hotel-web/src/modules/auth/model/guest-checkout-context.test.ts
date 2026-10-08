import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearGuestCheckoutReturn, readGuestCheckoutReturn, rememberGuestCheckoutReturn } from './guest-checkout-context';

afterEach(() => { vi.restoreAllMocks(); sessionStorage.clear(); });
describe('Non-sensitive checkout return across Google navigation', () => {
  it('keeps only booking search context, discarding unrelated personal or credential parameters', () => {
    rememberGuestCheckoutReturn('/reserva/checkout?checkIn=2026-10-10&adults=2&email=private%40example.com&token=synthetic-token');
    expect(readGuestCheckoutReturn()).toBe('/reserva/checkout?checkIn=2026-10-10&adults=2');
    expect(sessionStorage.getItem('pms:guest-checkout-return')).not.toMatch(/private|synthetic-token/);
    clearGuestCheckoutReturn(); expect(readGuestCheckoutReturn()).toBeUndefined();
  });
  it('rejects external and unrelated destinations both before saving and when reading altered storage', () => {
    rememberGuestCheckoutReturn('https://evil.example/reserva/checkout?adults=2');
    expect(readGuestCheckoutReturn()).toBeUndefined();
    sessionStorage.setItem('pms:guest-checkout-return', '//evil.example/reserva/checkout?adults=2');
    expect(readGuestCheckoutReturn()).toBeUndefined();
    rememberGuestCheckoutReturn('/mis-reservas'); expect(sessionStorage.length).toBe(0);
  });
  it('allows authentication to proceed even when browser storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage blocked'); });
    expect(() => rememberGuestCheckoutReturn('/reserva/checkout?adults=2')).not.toThrow();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage blocked'); });
    expect(readGuestCheckoutReturn()).toBeUndefined();
  });
  it('retains only the exact linking destination across Google navigation', () => {
    rememberGuestCheckoutReturn('/cuenta/reservas/vincular');
    expect(readGuestCheckoutReturn()).toBe('/cuenta/reservas/vincular');
    rememberGuestCheckoutReturn('/cuenta/reservas/vincular?accountId=someone-else');
    expect(readGuestCheckoutReturn()).toBeUndefined();
  });
});
