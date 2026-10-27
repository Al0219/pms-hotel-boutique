import { DomainMappingError } from '@/lib/errors/domain-mapping-error';
const fail = (): never => { throw new DomainMappingError('INVALID_GUEST_RESERVATION_LINK'); };
export const isGuestReservationUuid = (value: unknown): value is string => typeof value === 'string' && /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value);
export function mapRealLinkChallenge(value: unknown): { id: string } {
  if (!value || typeof value !== 'object' || !('requestId' in value) || !isGuestReservationUuid(value.requestId)) return fail();
  return { id: value.requestId.toLowerCase() };
}
export function mapRealLinkVerification(value: unknown): true { if (value !== null) return fail(); return true; }
