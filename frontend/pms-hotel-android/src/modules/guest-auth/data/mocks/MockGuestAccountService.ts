import { mapAccountProfileFixtureDto } from '@/modules/account/profile/data/mappers/mapAccountProfileFixtureDto';
import { MockAccountProfileService } from '@/modules/account/profile/data/mocks/MockAccountProfileService';
import { type AccountProfileService } from '@/modules/account/profile/data/services/AccountProfileService';
import { type GuestAccount } from '@/modules/account/profile/domain/AccountProfile';
import { type GuestAccountService } from '@/modules/guest-auth/data/services/GuestAccountService';
import { type GuestAuthSession } from '@/modules/guest-auth/domain/models/GuestAuthSession';

/** Adapts the canonical Account/Profile mock; it creates no parallel account fixture. */
export class MockGuestAccountService implements GuestAccountService {
  public constructor(private readonly accountProfileService: AccountProfileService = new MockAccountProfileService()) {}

  public async getCurrent(session: GuestAuthSession): Promise<GuestAccount> {
    const account = mapAccountProfileFixtureDto(await this.accountProfileService.getAccountProfile()).account;
    if (account.key !== session.accountId) throw new Error('Guest account is unavailable for this session');
    return { ...account };
  }
}
