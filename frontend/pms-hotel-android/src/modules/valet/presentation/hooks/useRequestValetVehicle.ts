import { useMutation } from '@tanstack/react-query';

import { mapRequestValetVehicleFixtureResult } from '@/modules/valet/data/mappers/mapValetFixtureDto';
import { MockValetService } from '@/modules/valet/data/mocks/MockValetService';
import { type ValetService } from '@/modules/valet/data/services/ValetService';
import { type ValetRequestResult } from '@/modules/valet/domain/models/ValetScreen';

const defaultValetService: ValetService = new MockValetService();

async function requestValetVehicle(
  service: ValetService,
  vehicleFixtureKey: string,
): Promise<ValetRequestResult> {
  return mapRequestValetVehicleFixtureResult(
    await service.requestVehicle({ vehicleFixtureKey }),
  );
}

/** The mutation state is Query-owned; it has no optimistic or offline queue behavior. */
export function useRequestValetVehicle(service: ValetService = defaultValetService) {
  return useMutation({
    mutationFn: (vehicleFixtureKey: string) => requestValetVehicle(service, vehicleFixtureKey),
    retry: false,
  });
}
