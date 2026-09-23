export {
  mapReserveTransferFixtureResult,
  mapRequestValetVehicleFixtureResult,
  mapValetScreenFixtureDto,
} from '@/modules/valet/data/mappers/mapValetFixtureDto';
export { MockValetService } from '@/modules/valet/data/mocks/MockValetService';
export type {
  TransferDestinationType as TransferDestinationTypeFixture,
  RequestValetVehicleFixtureInput,
  RequestValetVehicleFixtureResult,
  ReserveTransferFixtureInput,
  ReserveTransferFixtureResult,
  TransferFareEstimateFixtureDto,
  TransferFixtureDto,
  TransferPlaceFixtureDto,
  TransferRouteEstimateFixtureDto,
  ValetScreenFixtureDto,
  ValetVehicleFixtureDto,
} from '@/modules/valet/data/dtos/ValetFixtureDto';
export type { ValetService } from '@/modules/valet/data/services/ValetService';
export type {
  TransferDestinationType,
  TransferFareEstimate,
  TransferInfo,
  TransferPlace,
  TransferReservationResult,
  TransferRouteEstimate,
  ReserveTransferInput,
  ValetRequestResult,
  ValetScreen as ValetScreenModel,
  ValetVehicle,
} from '@/modules/valet/domain/models/ValetScreen';
export { ValetScreen } from '@/modules/valet/presentation/ValetScreen';
export type { AddSessionVehicleInput, SessionVehicle, SessionVehicleStatus, VehiclePlatePrefix } from '@/modules/valet/session/SessionVehicle';
export { initialSessionVehiclesState, SessionVehiclesProvider, sessionVehiclesReducer, useOptionalSessionVehicles, useSessionVehicles } from '@/modules/valet/session/SessionVehiclesProvider';
export { formatVehiclePlate, hasDuplicateVehiclePlate, normalizePlateForComparison, sanitizeVehiclePlateBodyInput, validateRequiredVehicleText, validateVehiclePlateBody, vehicleInputLimits, vehiclePlatePrefixes } from '@/modules/valet/session/vehicleValidation';

export { buildTransferSessionRequestInput } from '@/modules/valet/domain/buildTransferSessionRequestInput';
