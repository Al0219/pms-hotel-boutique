/** Confirmed Backend contract: GET /api/v1/public/availability. */
export interface PublicAvailabilityQueryDTO {
  propertyId: string;
  arrival: string;
  departure: string;
  rooms: number;
}

export interface PublicAvailabilityOfferDTO {
  roomTypeId: string;
  roomTypeCode: string;
  roomTypeName: string;
  ratePlanId: string;
  ratePlanCode: string;
  availableUnits: number;
  nightlyRateMinor: number;
  totalMinor: number;
}

export interface PublicAvailabilityResponseDTO {
  propertyId: string;
  arrival: string;
  departure: string;
  currency: string;
  offers: PublicAvailabilityOfferDTO[];
}
