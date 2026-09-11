import { useQuery } from '@tanstack/react-query';

import { mapTransferRouteEstimateFixtureDto } from '@/modules/valet/data/mappers/mapValetFixtureDto';
import { MockTransferRouteService } from '@/modules/valet/data/mocks/MockTransferRouteService';
import { type TransferRouteService } from '@/modules/valet/data/services/TransferRouteService';

const defaultRouteService: TransferRouteService = new MockTransferRouteService();

export function useTransferRouteEstimate(
  originKey: string | null,
  destinationKey: string | null,
  service: TransferRouteService = defaultRouteService,
) {
  return useQuery({
    queryKey: ['valet', 'transfer-route', originKey, destinationKey] as const,
    enabled: Boolean(originKey && destinationKey && originKey !== destinationKey),
    queryFn: async () => mapTransferRouteEstimateFixtureDto(await service.calculateRoute(originKey!, destinationKey!)),
    retry: false,
  });
}
