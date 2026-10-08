import { type AccountProfileFixtureDto, type UpdateAccountProfileFixtureInput, type UpdateAccountProfileFixtureResult } from '@/modules/account/profile/data/dto/AccountProfileFixtureDto';
export interface AccountProfileService {
  getAccountProfile(): Promise<AccountProfileFixtureDto>;
  updateAccountProfile(input: UpdateAccountProfileFixtureInput): Promise<UpdateAccountProfileFixtureResult>;
}
