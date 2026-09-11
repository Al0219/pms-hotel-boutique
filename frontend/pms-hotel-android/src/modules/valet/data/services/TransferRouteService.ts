import { type TransferRouteEstimateFixtureDto } from '@/modules/valet/data/dtos/ValetFixtureDto';

/** Replaceable route boundary; a future provider may call Maps/Routes outside the UI. */
export interface TransferRouteService {
  calculateRoute(originFixtureKey: string, destinationFixtureKey: string): Promise<TransferRouteEstimateFixtureDto>;
}
