import { type GuestAccount } from '@/modules/account/profile/domain/AccountProfile';
import { type GuestAuthSession } from '@/modules/guest-auth/domain/models/GuestAuthSession';

/** Resolves the canonical Account model; it never embeds Account data in Session. */
export interface GuestAccountService {
  getCurrent(session: GuestAuthSession): Promise<GuestAccount>;
}
