import { DomainMappingError } from '@/domain/errors/DomainMappingError';
import { type GuestAccount } from '@/modules/account/profile/domain/AccountProfile';
import { type GuestAccountSummaryDto } from '@/modules/guest-auth/data/dto/GuestAccountSummaryDto';

/** Summary does not authorize inventing phone, consent or a primary profile. */
export function mapGuestAccountSummaryDto(dto: GuestAccountSummaryDto): Pick<GuestAccount, 'key' | 'emailText' | 'displayName'> {
  if (!dto || typeof dto.guestAccountId !== 'string' || !dto.guestAccountId || typeof dto.email !== 'string' || !dto.email || dto.active !== true) throw new DomainMappingError('guestAccountSummary');
  return { key: dto.guestAccountId, emailText: dto.email, displayName: dto.email };
}
