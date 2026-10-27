export interface LedgerMoney { amount: string; currency: string }
export interface StaffFolioHeader {
  id: string; propertyId: string; type: 'GUEST' | 'COMPANY' | 'MASTER'; status: 'OPEN' | 'SETTLED' | 'CLOSED';
  reservationId: string | null; stayId: string | null; groupId: string | null; currency: string;
  holderLabel: string | null; createdAt: string; updatedAt: string;
}
export interface StaffFolioDetail { folio: StaffFolioHeader; balance: LedgerMoney; movementCount: number }
export interface StaffFolioMovement {
  id: string; folioId: string; kind: 'CHARGE' | 'PAYMENT' | 'ADJUSTMENT'; amount: LedgerMoney;
  description: string; reversesId: string | null; createdBy: string | null; createdAt: string;
}
export interface StaffFolioPage { propertyId: string; reservationId: string; items: StaffFolioHeader[]; nextCursor: string | null }
export interface StaffMovementPage { propertyId: string; folioId: string; items: StaffFolioMovement[]; nextCursor: string | null }
export interface ReceivedPayment { amount: LedgerMoney; description: string }
export interface StaffPaymentReceipt { operationId: string; propertyId: string; folioId: string; movementId: string; amount: LedgerMoney; completedAt: string }
export interface StaffFolioScope { propertyId: string; reservationId: string }

/** Currency scale only; calculations below use bigint, never binary floating point. */
export function currencyDigits(currency: string): number {
  const scale = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits;
  if (scale === undefined || scale > 3) throw new Error('UNSUPPORTED_CURRENCY_SCALE');
  return scale;
}
export function ledgerMinor(money: LedgerMoney): bigint {
  const digits = currencyDigits(money.currency);
  const [whole, fraction = ''] = money.amount.split('.');
  if (!/^-?\d+$/.test(whole) || fraction.length > digits || (fraction && !/^\d+$/.test(fraction))) throw new Error('INVALID_LEDGER_AMOUNT');
  const negative = whole.startsWith('-');
  return (BigInt(whole.replace('-', '')) * 10n ** BigInt(digits) + BigInt(fraction.padEnd(digits, '0') || '0')) * (negative ? -1n : 1n);
}
export function paymentMoney(input: string, currency: string): LedgerMoney | null {
  if (!/^(0|[1-9]\d{0,18})(\.\d{1,3})?$/.test(input)) return null;
  try {
    const digits = currencyDigits(currency), fraction = input.split('.')[1] ?? '';
    if (fraction.length > digits) return null;
    const amount = `${input.split('.')[0]}${digits ? `.${fraction.padEnd(digits, '0')}` : ''}`;
    const money = { amount, currency }, minor = ledgerMinor(money);
    return minor > 0n && minor <= 9223372036854775807n ? money : null;
  } catch { return null; }
}
export function formatLedgerMoney(value: LedgerMoney): string {
  const [whole, fraction] = value.amount.split('.');
  return `${value.currency === 'GTQ' ? 'Q' : value.currency} ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${fraction === undefined ? '' : `.${fraction}`}`;
}
