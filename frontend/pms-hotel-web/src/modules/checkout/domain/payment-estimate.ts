import type { resolveSelection } from '@/modules/booking';

/** User-approved illustrative one-night deposit, including the quoted estimated fees. Not hotel policy. */
export function paymentEstimate(items: ReturnType<typeof resolveSelection>, nights: number) {
  if (!Number.isSafeInteger(nights) || nights < 1 || !items.length || items.some(item => !item.valid || !item.rate?.priceBreakdown)) return null;
  const currencies = new Set(items.map(item => item.rate!.currency));
  if (currencies.size !== 1 || !['USD', 'GTQ'].includes(items[0].rate!.currency)) return null;
  const totalMinor = items.reduce((total, item) => total + Math.round(item.rate!.priceBreakdown!.estimatedTotal * 100) * item.quantity, 0);
  if (!Number.isSafeInteger(totalMinor) || totalMinor <= 0) return null;
  const guaranteeMinor = Math.round(totalMinor / nights);
  if (guaranteeMinor <= 0) return null;
  return { currency: items[0].rate!.currency, totalMinor, guaranteeMinor, remainingMinor: totalMinor - guaranteeMinor };
}

export function quoteFingerprint(items: ReturnType<typeof resolveSelection>, nights: number) {
  return JSON.stringify([nights, items.map(item => [item.roomTypeId, item.room?.code, item.ratePlanId, item.quantity, item.rate?.currency, item.rate?.nightlyRateMinor, item.rate?.totalMinor, item.rate?.totalAmount, item.rate?.priceBreakdown, item.rate?.cancellationPolicy, item.rate?.cancellationTerms]).sort()]);
}
