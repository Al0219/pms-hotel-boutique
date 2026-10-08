import { publicCurrencyReference } from '../content/public-currency-reference';

export type DisplayCurrency = 'USD' | 'GTQ';

/** Dated demo conversion in exact minor units. It never changes the original quote. */
export function convertCurrencyMinor(amountMinor: number, from: string, to: string): number | null {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) return null;
  if (from === to) return amountMinor;
  if (!((from === 'USD' && to === 'GTQ') || (from === 'GTQ' && to === 'USD'))) return null;
  const scale = BigInt(100000); // The existing reference has five decimal places.
  const rate = BigInt(Math.round(publicCurrencyReference.rate * 100000));
  const numerator = from === 'USD' ? rate : scale;
  const denominator = from === 'USD' ? scale : rate;
  const value = Number((BigInt(amountMinor) * numerator + denominator / BigInt(2)) / denominator);
  return Number.isSafeInteger(value) ? value : null;
}

/** Display conversion only. Never modify the quote, rate plan, or payment currency. */
export function displayMoney(amount: number, quotedCurrency: string, preferred: DisplayCurrency): string {
  const converted = convertCurrencyMinor(Math.round(Math.abs(amount) * 100), quotedCurrency, preferred);
  const currency = converted === null ? quotedCurrency : preferred;
  const value = converted === null ? amount : Math.sign(amount) * converted / 100;
  const digits = new Intl.NumberFormat('es', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
  const formatted = new Intl.NumberFormat('es-GT', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
  return `${currency === 'GTQ' ? 'Q' : currency === 'USD' ? 'US$' : currency} ${formatted}`;
}
