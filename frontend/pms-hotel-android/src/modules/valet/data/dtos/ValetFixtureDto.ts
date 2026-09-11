/** Frontend-only fixture DTOs approved for IMP-AND-0105; not a Backend API. */
export interface ValetVehicleFixtureDto {
  fixtureKey: string;
  vehicleDisplayText: string;
  colorText: string;
  plateText: string;
  registrationText: string;
  parkingDetailText: string;
  estimatedDeliveryText: string;
}

export type TransferDestinationType = 'HOTEL' | 'PLACE';

export interface TransferPlaceFixtureDto {
  fixtureKey: string;
  displayText: string;
  latitude: number;
  longitude: number;
  type: TransferDestinationType;
}

export interface TransferFixtureDto {
  title: string;
  defaultDestinationFixtureKey: string;
  defaultDateText: string;
  defaultTimeText: string;
  defaultPassengers: number;
}

export interface ValetScreenFixtureDto {
  activeVehicleFixtureKey: string;
  vehicles: ValetVehicleFixtureDto[];
  places: TransferPlaceFixtureDto[];
  transfer: TransferFixtureDto;
  folioNoticeText: string;
}

export interface RequestValetVehicleFixtureInput {
  vehicleFixtureKey: string;
}

export interface RequestValetVehicleFixtureResult {
  vehicleFixtureKey: string;
  requestReferenceText: string;
}

export interface TransferRouteEstimateFixtureDto {
  distanceKm: number;
  distanceText: string;
  durationMinutes: number;
  durationText: string;
}

export interface TransferFareEstimateFixtureDto {
  estimatedPrice: number;
  estimatedPriceText: string;
}

export interface ReserveTransferFixtureInput {
  destinationType: TransferDestinationType;
  destinationPlaceFixtureKey: string;
  pickupPlaceFixtureKey?: string;
  dateText: string;
  timeText: string;
  passengers: number;
  routeEstimate: TransferRouteEstimateFixtureDto;
  fareEstimate: TransferFareEstimateFixtureDto;
}

export interface ReserveTransferFixtureResult {
  confirmationText: string;
  referenceText: string;
}
