import { type AmenitiesService } from '@/modules/services/amenities/data/services/AmenitiesService';

export class MockAmenitiesService implements AmenitiesService {
  public constructor(private readonly submitRequestMock: AmenitiesService['submitRequest'] = async () => undefined) {}

  public submitRequest(input: Parameters<AmenitiesService['submitRequest']>[0]) { return this.submitRequestMock(input); }
}
