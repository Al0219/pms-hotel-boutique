import type { resolveSelection } from '@/modules/booking';

/** Only Backend stay totals; this quote establishes no tax or payment policy. */
export function accommodationQuote(items: ReturnType<typeof resolveSelection>) {
  if (!items.length || items.some(item => !item.valid || !item.rate || !Number.isSafeInteger(item.rate.totalMinor) || item.rate.totalMinor! <= 0)) return null;
  const currency = items[0].rate!.currency;
  if (items.some(item => item.rate!.currency !== currency)) return null;
  const accommodationTotalMinor = items.reduce((total, item) => total + item.rate!.totalMinor! * item.quantity, 0);
  if (!Number.isSafeInteger(accommodationTotalMinor)) return null;
  return { currency, accommodationTotalMinor, totalMinor: accommodationTotalMinor };
}
