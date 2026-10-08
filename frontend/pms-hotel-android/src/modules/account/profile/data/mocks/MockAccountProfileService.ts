import { accountProfileFixture } from '@/data/mocks/account/accountProfileFixture';
import { type AccountProfileFixtureDto, type UpdateAccountProfileFixtureInput, type UpdateAccountProfileFixtureResult } from '@/modules/account/profile/data/dto/AccountProfileFixtureDto';
import { type AccountProfileService } from '@/modules/account/profile/data/services/AccountProfileService';

function copy(value: AccountProfileFixtureDto): AccountProfileFixtureDto { return { account: { ...value.account }, profile: { ...value.profile } }; }
export class MockAccountProfileService implements AccountProfileService {
  private value: AccountProfileFixtureDto;
  public constructor(private readonly overrides: Partial<AccountProfileService> = {}, initial: AccountProfileFixtureDto = accountProfileFixture) { this.value = copy(initial); }
  public getAccountProfile(): Promise<AccountProfileFixtureDto> { return this.overrides.getAccountProfile?.() ?? Promise.resolve(copy(this.value)); }
  public updateAccountProfile(input: UpdateAccountProfileFixtureInput): Promise<UpdateAccountProfileFixtureResult> {
    if (this.overrides.updateAccountProfile) return this.overrides.updateAccountProfile(input);
    this.value = { account: { ...this.value.account, marketingSmsConsent: input.marketingSmsConsent }, profile: { ...input.profile } };
    return Promise.resolve({ ...copy(this.value), confirmationText: input.marketingSmsConsent === 'REVOKED' ? 'Marketing SMS revocado · otras finalidades/canales sin cambios' : 'Marketing SMS actualizado · otras finalidades/canales sin cambios', auditText: `Audit ${input.marketingSmsConsent === 'REVOKED' ? 'CONSENT_REVOKED' : 'CONSENT_GRANTED'} · Android Perfil · Marketing/SMS` });
  }
}
