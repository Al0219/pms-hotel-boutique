import { DomainMappingError } from '@/lib/errors';
import { isUtcInstant } from '@/lib/utc-instant';
import { currencyDigits, ledgerMinor, type LedgerMoney, type StaffFolioHeader, type StaffFolioDetail,
  type StaffFolioPage, type StaffMovementPage, type StaffPaymentReceipt } from '../model/staff-folio';

const fail = (): never => { throw new DomainMappingError('INVALID_STAFF_FOLIO'); };
export const isFolioUuid = (value: unknown): value is string => typeof value === 'string' && /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value);
function object(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : fail(); }
function uuid(value: unknown): string { return isFolioUuid(value) ? value.toLowerCase() : fail(); }
function nullableUuid(value: unknown): string | null { return value === null ? null : uuid(value); }
function instant(value: unknown): string { return isUtcInstant(value) ? value : fail(); }
function text(value: unknown, max: number): string { return typeof value === 'string' && value.trim() && value.length <= max ? value : fail(); }
function currency(value: unknown): string { return typeof value === 'string' && /^[A-Z]{3}$/.test(value) ? value : fail(); }
function cursor(value: unknown): string | null { return value === null ? null : typeof value === 'string' && value.length <= 512 && /^[\w-]+$/.test(value) ? value : fail(); }
function items(value: unknown): unknown[] { return Array.isArray(value) && value.length <= 100 ? value : fail(); }
export function mapLedgerMoney(value: unknown): LedgerMoney {
  const v = object(value), result = { amount: text(v.amount, 25), currency: currency(v.currency) };
  try {
    const scale = currencyDigits(result.currency);
    if (!new RegExp(`^-?(0|[1-9]\\d{0,18})${scale ? `\\.\\d{${scale}}` : ''}$`).test(result.amount)) return fail();
    const minor = ledgerMinor(result);
    if (minor < -9223372036854775808n || minor > 9223372036854775807n) return fail();
    return result;
  } catch { return fail(); }
}
function header(value: unknown, propertyId: string): StaffFolioHeader {
  const v = object(value);
  if (v.propertyId !== propertyId || typeof v.type !== 'string' || !['GUEST', 'COMPANY', 'MASTER'].includes(v.type)
    || typeof v.status !== 'string' || !['OPEN', 'SETTLED', 'CLOSED'].includes(v.status)) return fail();
  return { id: uuid(v.id), propertyId, type: v.type as StaffFolioHeader['type'], status: v.status as StaffFolioHeader['status'],
    reservationId: nullableUuid(v.reservationId), stayId: nullableUuid(v.stayId), groupId: nullableUuid(v.groupId), currency: currency(v.currency),
    holderLabel: v.holderLabel === null ? null : typeof v.holderLabel === 'string' && v.holderLabel.length <= 160 ? v.holderLabel : fail(),
    createdAt: instant(v.createdAt), updatedAt: instant(v.updatedAt) };
}
export function mapStaffFolioPage(dto: unknown, propertyId: string, reservationId: string): StaffFolioPage {
  const v = object(dto);
  if (v.propertyId !== propertyId || v.reservationId !== reservationId) return fail();
  const rows = items(v.items).map(value => { const row = header(value, propertyId); return row.reservationId === reservationId ? row : fail(); });
  if (new Set(rows.map(row => row.id)).size !== rows.length) return fail();
  return { propertyId, reservationId, items: rows, nextCursor: cursor(v.nextCursor) };
}
export function mapStaffFolioDetail(dto: unknown, propertyId: string, folioId: string): StaffFolioDetail {
  const v = object(dto), folio = header(v.folio, propertyId), balance = mapLedgerMoney(v.balance);
  if (folio.id !== folioId || folio.currency !== balance.currency || !Number.isSafeInteger(v.movementCount) || Number(v.movementCount) < 0) return fail();
  return { folio, balance, movementCount: Number(v.movementCount) };
}
export function mapStaffMovementPage(dto: unknown, propertyId: string, folioId: string): StaffMovementPage {
  const v = object(dto);
  if (v.propertyId !== propertyId || v.folioId !== folioId) return fail();
  const rows = items(v.items).map(value => {
    const m = object(value), amount = mapLedgerMoney(m.amount);
    if (m.folioId !== folioId || typeof m.kind !== 'string' || !['CHARGE', 'PAYMENT', 'ADJUSTMENT'].includes(m.kind) || ledgerMinor(amount) === 0n
      || (m.kind === 'PAYMENT' && ledgerMinor(amount) >= 0n) || (m.kind === 'CHARGE' && ledgerMinor(amount) <= 0n)) return fail();
    return { id: uuid(m.id), folioId, kind: m.kind as 'CHARGE' | 'PAYMENT' | 'ADJUSTMENT', amount,
      description: text(m.description, 255), reversesId: nullableUuid(m.reversesId), createdBy: nullableUuid(m.createdBy), createdAt: instant(m.createdAt) };
  });
  if (new Set(rows.map(row => row.id)).size !== rows.length) return fail();
  return { propertyId, folioId, items: rows, nextCursor: cursor(v.nextCursor) };
}
export function mapStaffPaymentReceipt(dto: unknown, propertyId: string, folioId: string): StaffPaymentReceipt {
  const v = object(dto), amount = mapLedgerMoney(v.amount);
  if (v.propertyId !== propertyId || v.folioId !== folioId || ledgerMinor(amount) <= 0n) return fail();
  return { operationId: uuid(v.operationId), propertyId, folioId, movementId: uuid(v.movementId), amount, completedAt: instant(v.completedAt) };
}
