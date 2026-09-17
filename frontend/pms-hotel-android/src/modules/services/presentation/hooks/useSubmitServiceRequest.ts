import { useMutation } from '@tanstack/react-query';

import { mapSubmitServiceRequestFixtureResult } from '@/modules/services/data/mappers/mapServicesFixtureDto';
import { MockServicesService } from '@/modules/services/data/mocks/MockServicesService';
import { type ServicesService } from '@/modules/services/data/services/ServicesService';
import { type ServiceRequestSubmission } from '@/modules/services/domain/models/ServiceCatalog';

const defaultServicesService: ServicesService = new MockServicesService();

async function submitServiceRequest(
  service: ServicesService,
  serviceFixtureKey: string,
): Promise<ServiceRequestSubmission> {
  return mapSubmitServiceRequestFixtureResult(
    await service.submitRequest({ serviceFixtureKey }),
  );
}

/** Mutation state is owned by TanStack Query; UI supplies only a selected key. */
export function useSubmitServiceRequest(service: ServicesService = defaultServicesService) {
  return useMutation({
    mutationFn: (serviceFixtureKey: string) => submitServiceRequest(service, serviceFixtureKey),
    retry: false,
  });
}
