import { requireDtoField } from '@/data/mapping/requireDtoField';
import { DomainMappingError } from '@/domain/errors/DomainMappingError';
import {
  type TransferDestinationType,
  type TransferFareEstimate,
  type TransferInfo,
  type TransferPlace,
  type TransferReservationResult,
  type TransferRouteEstimate,
  type ReserveTransferInput,
  type ValetRequestResult,
  type ValetScreen,
  type ValetVehicle,
} from '@/modules/valet/domain/models/ValetScreen';
import {
  type ReserveTransferFixtureInput,
  type ReserveTransferFixtureResult,
  type TransferDestinationType as TransferDestinationTypeFixture,
  type TransferFareEstimateFixtureDto,
  type TransferFixtureDto,
  type TransferPlaceFixtureDto,
  type TransferRouteEstimateFixtureDto,
  type RequestValetVehicleFixtureResult,
  type ValetScreenFixtureDto,
  type ValetVehicleFixtureDto,
} from '@/modules/valet/data/dtos/ValetFixtureDto';

function requireNonBlankString(value: string, field: string): string {
  const requiredValue = requireDtoField(value, field);

  if (requiredValue.trim().length === 0) {
    throw new DomainMappingError(field);
  }

  return requiredValue;
}

function mapVehicle(dto: ValetVehicleFixtureDto): ValetVehicle {
  const vehicle = requireDtoField(dto, 'valet.vehicle');

  return {
    key: requireNonBlankString(vehicle.fixtureKey, 'valet.vehicle.fixtureKey'),
    displayText: requireNonBlankString(vehicle.vehicleDisplayText, 'valet.vehicle.vehicleDisplayText'),
    colorText: requireNonBlankString(vehicle.colorText, 'valet.vehicle.colorText'),
    plateText: requireNonBlankString(vehicle.plateText, 'valet.vehicle.plateText'),
    registrationText: requireNonBlankString(vehicle.registrationText, 'valet.vehicle.registrationText'),
    parkingDetailText: requireNonBlankString(vehicle.parkingDetailText, 'valet.vehicle.parkingDetailText'),
    estimatedDeliveryText: requireNonBlankString(vehicle.estimatedDeliveryText, 'valet.vehicle.estimatedDeliveryText'),
  };
}

function mapDestinationType(type: TransferDestinationTypeFixture, field: string): TransferDestinationType {
  if (type === 'HOTEL' || type === 'PLACE') return type;
  throw new DomainMappingError(field);
}

function mapPlace(dto: TransferPlaceFixtureDto, index: number): TransferPlace {
  const place = requireDtoField(dto, `valet.places[${index}]`);
  if (!Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) {
    throw new DomainMappingError(`valet.places[${index}].coordinates`);
  }

  return {
    key: requireNonBlankString(place.fixtureKey, `valet.places[${index}].fixtureKey`),
    displayText: requireNonBlankString(place.displayText, `valet.places[${index}].displayText`),
    latitude: place.latitude,
    longitude: place.longitude,
    type: mapDestinationType(requireDtoField(place.type, `valet.places[${index}].type`), `valet.places[${index}].type`),
  };
}

function mapTransfer(dto: TransferFixtureDto): TransferInfo {
  const transfer = requireDtoField(dto, 'valet.transfer');
  const passengers = requireDtoField(transfer.defaultPassengers, 'valet.transfer.defaultPassengers');
  if (!Number.isInteger(passengers) || passengers < 1 || passengers > 3) throw new DomainMappingError('valet.transfer.defaultPassengers');
  return {
    title: requireNonBlankString(transfer.title, 'valet.transfer.title'),
    defaultDestinationKey: requireNonBlankString(transfer.defaultDestinationFixtureKey, 'valet.transfer.defaultDestinationFixtureKey'),
    defaultDateText: requireNonBlankString(transfer.defaultDateText, 'valet.transfer.defaultDateText'),
    defaultTimeText: requireNonBlankString(transfer.defaultTimeText, 'valet.transfer.defaultTimeText'),
    defaultPassengers: passengers,
  };
}

/** Pure mapping boundary between Valet fixture DTOs and UI-safe domain data. */
export function mapValetScreenFixtureDto(dto: ValetScreenFixtureDto): ValetScreen {
  const screen = requireDtoField(dto, 'valet');
  const vehicles = requireDtoField(screen.vehicles, 'valet.vehicles').map(mapVehicle);
  const places = requireDtoField(screen.places, 'valet.places').map(mapPlace);
  const activeVehicleKey = requireNonBlankString(
    screen.activeVehicleFixtureKey,
    'valet.activeVehicleFixtureKey',
  );

  if (!vehicles.some((vehicle) => vehicle.key === activeVehicleKey)) {
    throw new DomainMappingError('valet.activeVehicleFixtureKey');
  }
  const transfer = mapTransfer(screen.transfer);
  if (!places.some((place) => place.key === transfer.defaultDestinationKey)) {
    throw new DomainMappingError('valet.transfer.defaultDestinationFixtureKey');
  }

  return {
    activeVehicleKey,
    vehicles,
    places,
    transfer,
    folioNoticeText: requireNonBlankString(screen.folioNoticeText, 'valet.folioNoticeText'),
  };
}

export function mapReserveTransferFixtureResult(
  dto: ReserveTransferFixtureResult,
): TransferReservationResult {
  const result = requireDtoField(dto, 'valet.transferReservationResult');

  return {
    confirmationText: requireNonBlankString(
      result.confirmationText,
      'valet.transferReservationResult.confirmationText',
    ),
    referenceText: requireNonBlankString(
      result.referenceText,
      'valet.transferReservationResult.referenceText',
    ),
  };
}

export function mapTransferRouteEstimateFixtureDto(dto: TransferRouteEstimateFixtureDto): TransferRouteEstimate {
  const estimate = requireDtoField(dto, 'valet.routeEstimate');
  if (!Number.isFinite(estimate.distanceKm) || !Number.isFinite(estimate.durationMinutes)) throw new DomainMappingError('valet.routeEstimate');
  return {
    distanceKm: estimate.distanceKm,
    distanceText: requireNonBlankString(estimate.distanceText, 'valet.routeEstimate.distanceText'),
    durationMinutes: estimate.durationMinutes,
    durationText: requireNonBlankString(estimate.durationText, 'valet.routeEstimate.durationText'),
  };
}

export function mapTransferFareEstimateToFixtureDto(estimate: TransferFareEstimate): TransferFareEstimateFixtureDto {
  return { estimatedPrice: estimate.estimatedPrice, estimatedPriceText: estimate.estimatedPriceText };
}

export function mapReserveTransferInputToFixtureDto(input: ReserveTransferInput): ReserveTransferFixtureInput {
  return {
    destinationType: input.destinationType,
    destinationPlaceFixtureKey: input.destinationPlace.key,
    ...(input.pickupPlace ? { pickupPlaceFixtureKey: input.pickupPlace.key } : {}),
    dateText: input.dateText,
    timeText: input.timeText,
    passengers: input.passengers,
    routeEstimate: {
      distanceKm: input.routeEstimate.distanceKm,
      distanceText: input.routeEstimate.distanceText,
      durationMinutes: input.routeEstimate.durationMinutes,
      durationText: input.routeEstimate.durationText,
    },
    fareEstimate: mapTransferFareEstimateToFixtureDto(input.fareEstimate),
  };
}

export function mapRequestValetVehicleFixtureResult(
  dto: RequestValetVehicleFixtureResult,
): ValetRequestResult {
  const result = requireDtoField(dto, 'valet.requestResult');

  return {
    vehicleKey: requireNonBlankString(result.vehicleFixtureKey, 'valet.requestResult.vehicleFixtureKey'),
    requestReferenceText: requireNonBlankString(
      result.requestReferenceText,
      'valet.requestResult.requestReferenceText',
    ),
  };
}
