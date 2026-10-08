import { describe, expect, it } from 'vitest';
import { chosenPayment, defaultPaymentChoice } from './payment-choice';

describe('Checkout payment choices in minor units', () => {
  it('validates GTQ input limits before converting to the USD quote', () => {
    const choice = { ...defaultPaymentChoice, preset: 'custom' as const, customCurrency: 'GTQ' as const, customAmount: '1286.27' };
    expect(chosenPayment(50500, 16833, choice, 'USD').amountMinor).toBe(16833);
    expect(chosenPayment(50500, 16833, { ...choice, customAmount: '1286.26' }, 'USD').amountMinor).toBeNull();
    expect(chosenPayment(50500, 16833, { ...choice, customAmount: '3858.90' }, 'USD').amountMinor).toBeNull();
    expect(chosenPayment(50500, 16833, { ...choice, customAmount: '2294.32' }, 'USD').amountMinor).toBe(30025);
  });
  it('preserves quoted GTQ cents across dollar input switches and rejects a mismatched anchor', () => {
    const choice = { ...defaultPaymentChoice, preset: 'custom' as const, customCurrency: 'USD' as const, customAmount: '130.87', customQuotedMinor: 100001 };
    expect(chosenPayment(200000, 50000, choice, 'GTQ').amountMinor).toBe(100001);
    expect(chosenPayment(200000, 50000, { ...choice, customQuotedMinor: 100100 }, 'GTQ').amountMinor).toBeNull();
  });
  it('keeps exact balances for one night, half and full payment', () => {
    for (const [choice, expected] of [[defaultPaymentChoice, 16833], [{ ...defaultPaymentChoice, preset: 'half' as const }, 25250], [{ ...defaultPaymentChoice, mode: 'full' as const }, 50500]] as const) {
      expect(chosenPayment(50500, 16833, choice)).toEqual({ amountMinor: expected, error: '' });
      expect(expected + (50500 - expected)).toBe(50500);
    }
    expect(chosenPayment(50501, 16834, { ...defaultPaymentChoice, preset: 'half' }).amountMinor).toBe(25251);
  });
  it('accepts exact custom cents and both decimal separators at the limits', () => {
    for (const [raw, expected] of [['168.33', 16833], ['252,50', 25250], ['505', 50500]] as const) expect(chosenPayment(50500, 16833, { ...defaultPaymentChoice, preset: 'custom', customAmount: raw }).amountMinor).toBe(expected);
  });
  it('rejects missing, ambiguous, unsafe and out-of-range custom amounts', () => {
    for (const customAmount of ['', '168.32', '505.01', '252.501', '2e2', '-250', 'Infinity', '1,000.00', '90071992547409910']) {
      const result = chosenPayment(50500, 16833, { ...defaultPaymentChoice, preset: 'custom', customAmount });
      expect(result.amountMinor).toBeNull(); expect(result.error).not.toBe('');
    }
  });
  it('never offers a half-payment below the one-night minimum', () => {
    expect(chosenPayment(50500, 50500, { ...defaultPaymentChoice, preset: 'half' }).amountMinor).toBeNull();
    expect(chosenPayment(50500, 50500, defaultPaymentChoice).amountMinor).toBe(50500);
    expect(chosenPayment(50500, 0, defaultPaymentChoice).amountMinor).toBeNull();
  });
});
