import { useMutation } from '@tanstack/react-query';

import { MockHousekeepingService } from '@/modules/services/housekeeping/data/mocks/MockHousekeepingService';
import { type HousekeepingService } from '@/modules/services/housekeeping/data/services/HousekeepingService';
import { type HousekeepingRequest } from '@/modules/services/housekeeping/domain/HousekeepingRequest';

const defaultService: HousekeepingService = new MockHousekeepingService();

export function useSubmitHousekeeping(service: HousekeepingService = defaultService) {
  return useMutation({
    mutationFn: (input: HousekeepingRequest) => service.submitRequest(input),
    retry: false,
  });
}
