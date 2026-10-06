import { convertCurrencyMinor } from '@/modules/booking';

export interface PaymentChoice {
  mode: 'full' | 'partial';
  preset: 'night' | 'half' | 'custom';
  customAmount: string;
  customCurrency?: 'USD' | 'GTQ';
  /** Preserve the quote cents when changing the input currency, avoiding round-trip drift. */
  customQuotedMinor?: number;
}

export const defaultPaymentChoice: PaymentChoice = { mode: 'partial', preset: 'night', customAmount: '' };

/** Amounts remain in the quote currency and integer minor units, never converted display amounts. */
export function chosenPayment(totalMinor: number, minimumMinor: number, choice: PaymentChoice, quotedCurrency = 'USD') {
  if (!Number.isSafeInteger(totalMinor) || !Number.isSafeInteger(minimumMinor) || minimumMinor < 1 || minimumMinor > totalMinor) return { amountMinor: null, error: 'La cotización no permite calcular el pago.' };
  if (choice.mode === 'full') return { amountMinor: totalMinor, error: '' };
  if (choice.preset === 'night') return { amountMinor: minimumMinor, error: '' };
  // A one-night stay cannot accept a deposit below its full one-night minimum.
  if (choice.preset === 'half') {
    const half = Math.round(totalMinor / 2);
    return half < minimumMinor ? { amountMinor: null, error: 'El 50% es inferior al mínimo de una noche.' } : { amountMinor: half, error: '' };
  }
  const raw = choice.customAmount.trim();
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(raw)) return { amountMinor: null, error: 'Ingresa un monto válido con hasta dos decimales.' };
  const [whole, decimals = ''] = raw.replace(',', '.').split('.');
  const inputMinor = Number(whole) * 100 + Number(decimals.padEnd(2, '0'));
  const inputCurrency = choice.customCurrency ?? quotedCurrency;
  const minimumInput = convertCurrencyMinor(minimumMinor, quotedCurrency, inputCurrency);
  const maximumInput = convertCurrencyMinor(totalMinor, quotedCurrency, inputCurrency);
  if (!Number.isSafeInteger(inputMinor) || minimumInput === null || maximumInput === null || inputMinor < minimumInput || inputMinor > maximumInput) return { amountMinor: null, error: 'El monto debe estar entre una noche y el total de la estadía.' };
  const converted = convertCurrencyMinor(inputMinor, inputCurrency, quotedCurrency);
  if (converted === null) return { amountMinor: null, error: 'No pudimos convertir el monto.' };
  const anchored = choice.customQuotedMinor;
  if (anchored !== undefined && (!Number.isSafeInteger(anchored) || anchored < minimumMinor || anchored > totalMinor || convertCurrencyMinor(anchored, quotedCurrency, inputCurrency) !== inputMinor)) return { amountMinor: null, error: 'Revisa el monto después de cambiar la moneda.' };
  // Rounded visible limits can map a few cents outside a GTQ quote. Keep its exact limits.
  const amountMinor = anchored ?? Math.max(minimumMinor, Math.min(totalMinor, converted));
  return { amountMinor, error: '' };
}
