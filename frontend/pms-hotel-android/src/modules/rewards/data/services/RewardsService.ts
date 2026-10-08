import { type RewardsFixtureDto } from '@/modules/rewards/data/dto/RewardsFixtureDto';

export interface RewardsService {
  getRewards(): Promise<RewardsFixtureDto>;
}
