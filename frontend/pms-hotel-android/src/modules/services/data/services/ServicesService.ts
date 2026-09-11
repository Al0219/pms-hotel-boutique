import {
  type ServicesCatalogFixtureDto,
  type SubmitServiceRequestFixtureInput,
  type SubmitServiceRequestFixtureResult,
} from '@/modules/services/data/dtos/ServicesFixtureDto';

/** Frontend mock remote boundary. A Backend endpoint is intentionally deferred. */
export interface ServicesService {
  getCatalog(): Promise<ServicesCatalogFixtureDto>;
  submitRequest(
    input: SubmitServiceRequestFixtureInput,
  ): Promise<SubmitServiceRequestFixtureResult>;
}
