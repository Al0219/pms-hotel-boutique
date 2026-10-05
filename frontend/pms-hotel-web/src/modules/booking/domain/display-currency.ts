import { publicCurrencyReference } from '../content/public-currency-reference';

export type DisplayCurrency = 'USD' | 'GTQ';

/** Display conversion only. Never modify the quote, rate plan, or payment currency. */
export function displayMoney(amount: number, quotedCurrency: string, preferred: DisplayCurrency): string {
  const convert = quotedCurrency === 'USD' && preferred === 'GTQ';
  const currency = convert ? 'GTQ' : quotedCurrency;
  const value = convert ? Math.round(amount * publicCurrencyReference.rate * 100) / 100 : amount;
  const digits = new Intl.NumberFormat('es', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
  const formatted = new Intl.NumberFormat('es-GT', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
  return `${currency === 'GTQ' ? 'Q' : currency === 'USD' ? 'US$' : currency} ${formatted}`;
}
