import { useQuery } from '@tanstack/react-query';

import { mapValetScreenFixtureDto } from '@/modules/valet/data/mappers/mapValetFixtureDto';
import { MockValetService } from '@/modules/valet/data/mocks/MockValetService';
import { type ValetService } from '@/modules/valet/data/services/ValetService';
import { type ValetScreen } from '@/modules/valet/domain/models/ValetScreen';

export const valetScreenQueryKey = ['valet', 'screen'] as const;

const defaultValetService: ValetService = new MockValetService();

async function loadValetScreen(service: ValetService): Promise<ValetScreen> {
  return mapValetScreenFixtureDto(await service.getScreen());
}

/** TanStack Query owns the server-like screen data; no parallel store is created. */
export function useValetScreen(service: ValetService = defaultValetService) {
  return useQuery({
    queryKey: valetScreenQueryKey,
    queryFn: () => loadValetScreen(service),
    retry: false,
  });
}
