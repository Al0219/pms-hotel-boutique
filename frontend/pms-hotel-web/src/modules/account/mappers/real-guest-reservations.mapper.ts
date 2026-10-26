import { DomainMappingError } from '@/lib/errors/domain-mapping-error';
import { guestReservationStatuses, guestStayStatuses, type RealGuestReservation, type RealGuestReservationDetail,
  type RealGuestReservationPage, type RealGuestStay } from '../model/real-guest-reservations';

const fail = (): never => { throw new DomainMappingError('INVALID_GUEST_RESERVATION'); };
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : fail();
const text = (value: unknown): string => typeof value === 'string' && value.trim() ? value : fail();
export const isGuestReservationUuid = (value: unknown): value is string => typeof value === 'string' && /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value);
const uuid = (value: unknown): string => isGuestReservationUuid(value) ? value.toLowerCase() : fail();
const integer = (value: unknown): number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : fail();
function day(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value + 'T00:00:00Z'))
    || new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) !== value) return fail();
  return value;
}
function status<T extends string>(value: unknown, allowed: readonly T[]): T { return typeof value === 'string' && allowed.includes(value as T) ? value as T : fail(); }
function stay(value: unknown): RealGuestStay {
  const s = record(value); const arrival = day(s.arrival), departure = day(s.departure);
  if (departure <= arrival) return fail();
  return { reservationStayId: uuid(s.reservationStayId), roomTypeId: uuid(s.roomTypeId), roomTypeName: text(s.roomTypeName), arrival, departure, status: status(s.status, guestStayStatuses) };
}
function reservation(value: unknown): RealGuestReservation {
  const r = record(value); const zone = text(r.propertyTimeZone);
  try { new Intl.DateTimeFormat('es-GT', { timeZone: zone }); } catch { return fail(); }
  if (!Array.isArray(r.stays) || !(r.bookingGuestName === null || typeof r.bookingGuestName === 'string' && r.bookingGuestName.trim())) return fail();
  const stays = r.stays.map(stay);
  if (new Set(stays.map(s => s.reservationStayId)).size !== stays.length) return fail();
  const code = text(r.confirmationCode); if (code.length > 16) return fail();
  return { reservationId: uuid(r.reservationId), confirmationCode: code, status: status(r.status, guestReservationStatuses),
    propertyId: uuid(r.propertyId), propertyName: text(r.propertyName), propertyTimeZone: zone, bookingGuestName: r.bookingGuestName as string | null, stays };
}
export function mapRealGuestReservationPage(value: unknown, accountId?: string, page?: number, size?: number): RealGuestReservationPage {
  const p = record(value); const owner = uuid(p.guestAccountId), currentPage = integer(p.page), currentSize = integer(p.size), total = integer(p.totalElements);
  if (accountId !== undefined && owner !== accountId.toLowerCase() || page !== undefined && currentPage !== page || size !== undefined && currentSize !== size
    || currentPage > 2147483647 || currentSize < 1 || currentSize > 50 || !Array.isArray(p.items)) return fail();
  const items = p.items.map(reservation);
  if (items.length !== Math.min(currentSize, Math.max(0, total - currentPage * currentSize))
    || new Set(items.map(r => r.reservationId)).size !== items.length) return fail();
  return { guestAccountId: owner, page: currentPage, size: currentSize, totalElements: total, items };
}
export function mapRealGuestReservationDetail(value: unknown, accountId?: string, reservationId?: string): RealGuestReservationDetail {
  const p = record(value); const owner = uuid(p.guestAccountId); const item = reservation(p.reservation);
  if (accountId !== undefined && owner !== accountId.toLowerCase() || reservationId !== undefined && item.reservationId !== reservationId.toLowerCase()) return fail();
  return { guestAccountId: owner, reservation: item };
}
export function mapRealLinkChallenge(value: unknown): { id: string } { return { id: uuid(record(value).requestId) }; }
export function mapRealLinkVerification(value: unknown): true { if (value !== null) return fail(); return true; }
