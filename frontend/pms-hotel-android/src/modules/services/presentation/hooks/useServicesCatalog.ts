import { useQuery } from '@tanstack/react-query';

import { mapServicesCatalogFixtureDto } from '@/modules/services/data/mappers/mapServicesFixtureDto';
import { MockServicesService } from '@/modules/services/data/mocks/MockServicesService';
import { type ServicesService } from '@/modules/services/data/services/ServicesService';
import { type ServicesCatalog } from '@/modules/services/domain/models/ServiceCatalog';

export const servicesCatalogQueryKey = ['services', 'catalog'] as const;

const defaultServicesService: ServicesService = new MockServicesService();

async function loadServicesCatalog(service: ServicesService): Promise<ServicesCatalog> {
  return mapServicesCatalogFixtureDto(await service.getCatalog());
}

/** TanStack Query owns the catalog state; this hook creates no parallel store. */
export function useServicesCatalog(service: ServicesService = defaultServicesService) {
  return useQuery({
    queryKey: servicesCatalogQueryKey,
    queryFn: () => loadServicesCatalog(service),
    retry: false,
  });
}
