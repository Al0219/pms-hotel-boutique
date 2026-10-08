import { describe, expect, it } from 'vitest';
import { convertCurrencyMinor, displayMoney } from './display-currency';
import { publicResultsHref, publicRoomHref } from './public-room-navigation';

describe('Public display currency and navigation', () => {
  it('converts GTQ quotes back to dollars and keeps exact minor-unit boundaries', () => {
    expect(displayMoney(3858.89, 'GTQ', 'USD')).toBe('US$ 505.00');
    expect(convertCurrencyMinor(16833, 'USD', 'GTQ')).toBe(128627);
    expect(convertCurrencyMinor(128627, 'GTQ', 'USD')).toBe(16833);
    expect(convertCurrencyMinor(30025, 'USD', 'GTQ')).toBe(229432);
    expect(convertCurrencyMinor(100, 'EUR', 'GTQ')).toBeNull();
    expect(convertCurrencyMinor(Number.MAX_SAFE_INTEGER, 'USD', 'GTQ')).toBeNull();
    expect(convertCurrencyMinor(100.5, 'USD', 'GTQ')).toBeNull();
  });
  it('rounds indicative GTQ without changing USD prices', () => {
    expect(displayMoney(145, 'USD', 'USD')).toBe('US$ 145.00');
    expect(displayMoney(145, 'USD', 'GTQ')).toBe('Q 1,108.00');
    expect(displayMoney(505, 'USD', 'GTQ')).toBe('Q 3,858.89');
    expect(displayMoney(10, 'EUR', 'GTQ')).toBe('EUR 10.00');
  });
  it('preserves criteria and opaque promotions without leaking physical room IDs', () => {
    const criteria = { checkIn: '2026-10-10', checkOut: '2026-10-13', adults: 3, children: 1, roomsCount: 2, promoCode: 'FALL & WINTER' };
    expect(publicResultsHref(criteria)).toBe('/habitaciones?checkIn=2026-10-10&checkOut=2026-10-13&adults=3&children=1&roomsCount=2&promoCode=FALL+%26+WINTER');
    expect(publicRoomHref('rt_suite', criteria, 'rp_flex')).toContain('/habitaciones/rt_suite?');
    expect(publicRoomHref('rt_suite', criteria, 'rp_flex')).toContain('ratePlanId=rp_flex');
    expect(publicRoomHref('rt_suite', {})).toBe('/habitaciones/rt_suite');
  });
});
