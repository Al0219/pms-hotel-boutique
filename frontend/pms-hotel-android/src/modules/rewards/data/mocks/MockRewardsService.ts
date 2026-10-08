import { rewardsFixture } from '@/modules/rewards/data/mocks/rewardsFixture';
import { type RewardsFixtureDto } from '@/modules/rewards/data/dto/RewardsFixtureDto';
import { type RewardsService } from '@/modules/rewards/data/services/RewardsService';

export class MockRewardsService implements RewardsService {
  public constructor(private readonly overrides: Partial<RewardsService> = {}) {}

  public getRewards(): Promise<RewardsFixtureDto> {
    return this.overrides.getRewards?.() ?? Promise.resolve(rewardsFixture);
  }
}
