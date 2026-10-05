import { DomainMappingError } from '@/lib/errors/domain-mapping-error';
import { object, text } from '@/lib/validation';
import type { ReservationLinkChallengeDTO, ReservationLinkResultDTO } from '../dtos/reservation-link.dto';
import type { ReservationLinkChallenge, ReservationLinkResult } from '../model/reservation-link';

export function mapLinkChallenge(dto: ReservationLinkChallengeDTO, accountId: string): ReservationLinkChallenge {
  const value = object(dto);
  if (text(value.account_id) !== accountId) throw new DomainMappingError('ACCOUNT_SCOPE_MISMATCH');
  const expiresAt = text(value.expires_at);
  if (!Number.isFinite(Date.parse(expiresAt)) || !expiresAt.endsWith('Z')) throw new DomainMappingError('INVALID_EXPIRATION');
  return { id: text(value.request_id), expiresAt };
}
export function mapLinkResult(dto: ReservationLinkResultDTO, accountId: string, requestId: string): ReservationLinkResult {
  const value = object(dto);
  if (text(value.account_id) !== accountId || text(value.request_id) !== requestId) throw new DomainMappingError('LINK_SCOPE_MISMATCH');
  return { reservationId: text(value.reservation_id) };
}
