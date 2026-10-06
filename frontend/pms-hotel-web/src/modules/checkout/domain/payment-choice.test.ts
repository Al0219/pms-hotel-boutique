import { describe, expect, it } from 'vitest';
import { chosenPayment, defaultPaymentChoice } from './payment-choice';

describe('Checkout payment choices in minor units', () => {
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
