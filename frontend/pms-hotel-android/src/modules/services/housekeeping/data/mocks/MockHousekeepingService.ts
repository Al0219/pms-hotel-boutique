import { type HousekeepingService } from '@/modules/services/housekeeping/data/services/HousekeepingService';

export interface MockHousekeepingServiceOptions {
  submitRequest?: HousekeepingService['submitRequest'];
}

/** Replaceable frontend-first boundary; no persistence, queue or HTTP. */
export class MockHousekeepingService implements HousekeepingService {
  private readonly submitRequestMock: HousekeepingService['submitRequest'];

  public constructor(options: MockHousekeepingServiceOptions = {}) {
    this.submitRequestMock = options.submitRequest ?? (async () => undefined);
  }

  public submitRequest(...args: Parameters<HousekeepingService['submitRequest']>) {
    return this.submitRequestMock(...args);
  }
}
