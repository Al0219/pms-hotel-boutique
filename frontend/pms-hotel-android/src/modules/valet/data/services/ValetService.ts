import {
  type RequestValetVehicleFixtureInput,
  type RequestValetVehicleFixtureResult,
  type ReserveTransferFixtureInput,
  type ReserveTransferFixtureResult,
  type ValetScreenFixtureDto,
} from '@/modules/valet/data/dtos/ValetFixtureDto';

/** Replaceable frontend remote boundary. No Backend transport exists yet. */
export interface ValetService {
  getScreen(): Promise<ValetScreenFixtureDto>;
  requestVehicle(
    input: RequestValetVehicleFixtureInput,
  ): Promise<RequestValetVehicleFixtureResult>;
  reserveTransfer(input: ReserveTransferFixtureInput): Promise<ReserveTransferFixtureResult>;
}
