/** UI-safe Valet read models. Keys stay local to the frontend fixture boundary. */
export interface ValetVehicle {
  key: string;
  displayText: string;
  colorText: string;
  plateText: string;
  registrationText: string;
  parkingDetailText: string;
  estimatedDeliveryText: string;
}

export interface TransferInfo {
  title: string;
  defaultDestinationKey: string;
  defaultDateText: string;
  defaultTimeText: string;
  defaultPassengers: number;
}

export interface TransferRouteEstimate {
  distanceKm: number;
  distanceText: string;
  durationMinutes: number;
  durationText: string;
}

export interface TransferFareEstimate {
  estimatedPrice: number;
  estimatedPriceText: string;
}

export interface ReserveTransferInput {
  destinationType: TransferDestinationType;
  destinationPlace: TransferPlace;
  pickupPlace: TransferPlace | null;
  dateText: string;
  timeText: string;
  passengers: number;
  routeEstimate: TransferRouteEstimate;
  fareEstimate: TransferFareEstimate;
}

export interface ValetScreen {
  activeVehicleKey: string;
  vehicles: ValetVehicle[];
  places: TransferPlace[];
  transfer: TransferInfo;
  folioNoticeText: string;
}

/** Local mock acknowledgement, not a persisted valet request entity. */
export interface ValetRequestResult {
  vehicleKey: string;
  requestReferenceText: string;
}

/** Frontend mock acknowledgement; not a transfer booking Backend entity. */
export interface TransferReservationResult {
  confirmationText: string;
  referenceText: string;
}
export type TransferDestinationType = 'HOTEL' | 'PLACE';

export interface TransferPlace {
  key: string;
  displayText: string;
  latitude: number;
  longitude: number;
  type: TransferDestinationType;
}
