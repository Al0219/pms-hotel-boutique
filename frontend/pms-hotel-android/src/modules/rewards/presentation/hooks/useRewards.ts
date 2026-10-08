import { useQuery } from '@tanstack/react-query';

import { mapRewardsFixtureDto } from '@/modules/rewards/data/mappers/mapRewardsFixtureDto';
import { MockRewardsService } from '@/modules/rewards/data/mocks/MockRewardsService';
import { type RewardsService } from '@/modules/rewards/data/services/RewardsService';

const service = new MockRewardsService();

export function useRewards(override: RewardsService = service) {
  return useQuery({
    queryKey: ['rewards'],
    queryFn: async () => mapRewardsFixtureDto(await override.getRewards()),
    retry: false,
  });
}
