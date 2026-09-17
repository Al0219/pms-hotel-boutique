import { valetScreenFixture } from '@/data/mocks/valet/valetScreenFixture';
import {
  type RequestValetVehicleFixtureInput,
  type RequestValetVehicleFixtureResult,
  type ReserveTransferFixtureInput,
  type ReserveTransferFixtureResult,
  type ValetScreenFixtureDto,
} from '@/modules/valet/data/dtos/ValetFixtureDto';
import { type ValetService } from '@/modules/valet/data/services/ValetService';

export interface MockValetServiceOptions {
  getScreen?: () => Promise<ValetScreenFixtureDto>;
  requestVehicle?: (
    input: RequestValetVehicleFixtureInput,
  ) => Promise<RequestValetVehicleFixtureResult>;
  reserveTransfer?: (input: ReserveTransferFixtureInput) => Promise<ReserveTransferFixtureResult>;
}

/** Controlled mock boundary for deterministic success, failure, offline and pending tests. */
export class MockValetService implements ValetService {
  private readonly getScreenMock: () => Promise<ValetScreenFixtureDto>;
  private readonly requestVehicleMock: (
    input: RequestValetVehicleFixtureInput,
  ) => Promise<RequestValetVehicleFixtureResult>;
  private readonly reserveTransferMock: (input: ReserveTransferFixtureInput) => Promise<ReserveTransferFixtureResult>;

  public constructor(options: MockValetServiceOptions = {}) {
    this.getScreenMock = options.getScreen ?? (async () => valetScreenFixture);
    this.requestVehicleMock = options.requestVehicle ?? (async ({ vehicleFixtureKey }) => ({
      vehicleFixtureKey,
      requestReferenceText: 'VAL-0148',
    }));
    this.reserveTransferMock = options.reserveTransfer ?? (async () => ({ confirmationText: 'Traslado reservado', referenceText: 'TRF-0220' }));
  }

  public getScreen(): Promise<ValetScreenFixtureDto> {
    return this.getScreenMock();
  }

  public requestVehicle(
    input: RequestValetVehicleFixtureInput,
  ): Promise<RequestValetVehicleFixtureResult> {
    return this.requestVehicleMock(input);
  }

  public reserveTransfer(input: ReserveTransferFixtureInput): Promise<ReserveTransferFixtureResult> {
    return this.reserveTransferMock(input);
  }
}
