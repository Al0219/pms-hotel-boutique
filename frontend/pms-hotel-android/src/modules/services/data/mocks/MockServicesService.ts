import { servicesCatalogFixture } from '@/modules/services/data/mocks/servicesCatalogFixture';
import {
  type ServicesCatalogFixtureDto,
  type SubmitServiceRequestFixtureInput,
  type SubmitServiceRequestFixtureResult,
} from '@/modules/services/data/dtos/ServicesFixtureDto';
import { type ServicesService } from '@/modules/services/data/services/ServicesService';

export interface MockServicesServiceOptions {
  getCatalog?: () => Promise<ServicesCatalogFixtureDto>;
  submitRequest?: (
    input: SubmitServiceRequestFixtureInput,
  ) => Promise<SubmitServiceRequestFixtureResult>;
}

/** Controlled Remote/API fixture boundary for Services tests and frontend-first UI. */
export class MockServicesService implements ServicesService {
  private readonly getCatalogMock: () => Promise<ServicesCatalogFixtureDto>;
  private readonly submitRequestMock: (
    input: SubmitServiceRequestFixtureInput,
  ) => Promise<SubmitServiceRequestFixtureResult>;

  public constructor(options: MockServicesServiceOptions = {}) {
    this.getCatalogMock = options.getCatalog ?? (async () => servicesCatalogFixture);
    this.submitRequestMock = options.submitRequest ?? (async ({ serviceFixtureKey }) => ({
      serviceFixtureKey,
    }));
  }

  public getCatalog(): Promise<ServicesCatalogFixtureDto> {
    return this.getCatalogMock();
  }

  public submitRequest(
    input: SubmitServiceRequestFixtureInput,
  ): Promise<SubmitServiceRequestFixtureResult> {
    return this.submitRequestMock(input);
  }
}
