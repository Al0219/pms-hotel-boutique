import { useQuery } from '@tanstack/react-query';

import { mapPromotionsFixtureDto } from '@/modules/promotions/data/mappers/mapPromotionsFixtureDto';
import { MockPromotionsService } from '@/modules/promotions/data/mocks/MockPromotionsService';
import { type PromotionsService } from '@/modules/promotions/data/services/PromotionsService';

const service = new MockPromotionsService();

export function usePromotions(override: PromotionsService = service) {
  return useQuery({
    queryKey: ['promotions'],
    queryFn: async () => mapPromotionsFixtureDto(await override.getPromotions()),
    retry: false,
  });
}
