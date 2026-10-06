export interface PaymentChoice {
  mode: 'full' | 'partial';
  preset: 'night' | 'half' | 'custom';
  customAmount: string;
}

export const defaultPaymentChoice: PaymentChoice = { mode: 'partial', preset: 'night', customAmount: '' };

/** Amounts remain in the quote currency and integer minor units, never converted display amounts. */
export function chosenPayment(totalMinor: number, minimumMinor: number, choice: PaymentChoice) {
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
  const amountMinor = Number(whole) * 100 + Number(decimals.padEnd(2, '0'));
  if (!Number.isSafeInteger(amountMinor) || amountMinor < minimumMinor || amountMinor > totalMinor) return { amountMinor: null, error: 'El monto debe estar entre una noche y el total de la estadía.' };
  return { amountMinor, error: '' };
}
