import { valetScreenFixture } from '@/data/mocks/valet/valetScreenFixture';
import { type TransferRouteEstimateFixtureDto } from '@/modules/valet/data/dtos/ValetFixtureDto';
import { type TransferRouteService } from '@/modules/valet/data/services/TransferRouteService';

export interface MockTransferRouteServiceOptions {
  calculateRoute?: (originFixtureKey: string, destinationFixtureKey: string) => Promise<TransferRouteEstimateFixtureDto>;
}

/** Deterministic coordinate mock. No Google API, geocoding, GPS or network exists here. */
export class MockTransferRouteService implements TransferRouteService {
  private readonly calculateRouteMock: (originFixtureKey: string, destinationFixtureKey: string) => Promise<TransferRouteEstimateFixtureDto>;

  public constructor(options: MockTransferRouteServiceOptions = {}) {
    this.calculateRouteMock = options.calculateRoute ?? (async (originKey, destinationKey) => {
      const origin = valetScreenFixture.places.find((place) => place.fixtureKey === originKey);
      const destination = valetScreenFixture.places.find((place) => place.fixtureKey === destinationKey);
      if (!origin || !destination) throw new Error('Unknown mock transfer place');
      const distanceKm = Number((Math.hypot(origin.latitude - destination.latitude, origin.longitude - destination.longitude) * 111).toFixed(1));
      const durationMinutes = Math.max(1, Math.round(distanceKm * 2.25));
      return { distanceKm, distanceText: `${distanceKm.toFixed(1)} km`, durationMinutes, durationText: `${durationMinutes} min` };
    });
  }

  public calculateRoute(originFixtureKey: string, destinationFixtureKey: string): Promise<TransferRouteEstimateFixtureDto> {
    return this.calculateRouteMock(originFixtureKey, destinationFixtureKey);
  }
}
