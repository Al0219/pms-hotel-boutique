import { DomainMappingError } from "@/lib/errors";

import type {
  AvailabilityResponseDto,
  AvailabilitySearchQueryDto,
  AvailableRoomTypeDto,
  RatePlanOptionDto,
} from "../dtos/availability.dto";
import type {
  AvailabilitySearchParams,
  AvailabilitySearchResult,
  AvailableRoomType,
  RatePlanOption,
} from "../model/availability-option";

function parseMoneyAmount(value: string | undefined | null, fieldName: string): number {
  if (typeof value !== "string" || !/^\d+(?:\.\d+)?$/.test(value.trim())) {
    throw new DomainMappingError(`INVALID_AMOUNT_${fieldName.toUpperCase()}`);
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new DomainMappingError(`INVALID_NUMERIC_AMOUNT_${fieldName.toUpperCase()}`);
  }

  return parsed;
}

export function mapRatePlanDtoToDomain(dto: RatePlanOptionDto): RatePlanOption {
  if (!dto || typeof dto.rate_plan_id !== "string" || !dto.rate_plan_id.trim()) {
    throw new DomainMappingError("MISSING_RATE_PLAN_ID");
  }

  if (typeof dto.rate_plan_name !== "string" || !dto.rate_plan_name.trim()) {
    throw new DomainMappingError("MISSING_RATE_PLAN_NAME");
  }

  if (typeof dto.currency !== "string" || !/^[A-Za-z]{3}$/.test(dto.currency.trim())) {
    throw new DomainMappingError("MISSING_CURRENCY");
  }

  if (typeof dto.cancellation_policy !== "string" || !dto.cancellation_policy.trim()) {
    throw new DomainMappingError("MISSING_CANCELLATION_POLICY");
  }

  return {
    ratePlanId: dto.rate_plan_id.trim(),
    name: dto.rate_plan_name.trim(),
    description: dto.description ?? null,
    baseNightlyRate: parseMoneyAmount(dto.base_nightly_rate, "base_nightly_rate"),
    totalAmount: parseMoneyAmount(dto.total_amount, "total_amount"),
    currency: dto.currency.trim().toUpperCase(),
    cancellationPolicy: dto.cancellation_policy.trim(),
    mealsIncluded: dto.meals_included ?? null,
  };
}

export function mapRoomTypeDtoToDomain(dto: AvailableRoomTypeDto): AvailableRoomType {
  if (!dto || typeof dto.room_type_id !== "string" || !dto.room_type_id.trim()) {
    throw new DomainMappingError("MISSING_ROOM_TYPE_ID");
  }

  if (typeof dto.name !== "string" || !dto.name.trim()) {
    throw new DomainMappingError("MISSING_ROOM_TYPE_NAME");
  }

  if (typeof dto.code !== "string" || !dto.code.trim()) {
    throw new DomainMappingError("MISSING_ROOM_TYPE_CODE");
  }

  const maxOccupancy = dto.max_occupancy;
  if (!Number.isSafeInteger(maxOccupancy) || maxOccupancy <= 0) {
    throw new DomainMappingError("INVALID_MAX_OCCUPANCY");
  }

  const availableRoomsCount = dto.available_rooms_count;
  if (!Number.isSafeInteger(availableRoomsCount) || availableRoomsCount < 0) {
    throw new DomainMappingError("INVALID_AVAILABLE_ROOMS_COUNT");
  }

  if (!Array.isArray(dto.rate_plans)) throw new DomainMappingError("MISSING_RATE_PLANS");
  const ratePlans = dto.rate_plans.map(mapRatePlanDtoToDomain);

  if (dto.category !== undefined && !["DELUXE", "SUITE", "SUPERIOR"].includes(dto.category)) {
    throw new DomainMappingError("INVALID_ROOM_CATEGORY");
  }
  for (const value of [dto.bed_description, dto.badge]) {
    if (value !== undefined && (typeof value !== "string" || !value.trim())) {
      throw new DomainMappingError("INVALID_CATALOGUE_TEXT");
    }
  }
  if (dto.area_square_meters !== undefined && (!Number.isFinite(dto.area_square_meters) || dto.area_square_meters <= 0)) {
    throw new DomainMappingError("INVALID_ROOM_AREA");
  }
  if (dto.amenities !== undefined && (!Array.isArray(dto.amenities) || dto.amenities.some(value => typeof value !== "string" || !value.trim()))) {
    throw new DomainMappingError("INVALID_ROOM_AMENITIES");
  }

  return {
    roomTypeId: dto.room_type_id.trim(),
    name: dto.name.trim(),
    code: dto.code.trim(),
    description: dto.description ?? null,
    maxOccupancy,
    availableRoomsCount,
    ratePlans,
    images: Array.isArray(dto.images) ? [...dto.images] : [],
    category: dto.category,
    bedDescription: dto.bed_description?.trim(),
    areaSquareMeters: dto.area_square_meters,
    amenities: dto.amenities?.map(value => value.trim()),
    badge: dto.badge?.trim(),
  };
}

export function mapAvailabilityResponseToDomain(dto: AvailabilityResponseDto): AvailabilitySearchResult {
  if (!dto || typeof dto.property_id !== "string" || !dto.property_id.trim()) {
    throw new DomainMappingError("MISSING_PROPERTY_ID");
  }

  if (typeof dto.check_in_date !== "string" || !dto.check_in_date.trim()) {
    throw new DomainMappingError("MISSING_CHECK_IN_DATE");
  }

  if (typeof dto.check_out_date !== "string" || !dto.check_out_date.trim()) {
    throw new DomainMappingError("MISSING_CHECK_OUT_DATE");
  }

  const validDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };
  if (!validDate(dto.check_in_date) || !validDate(dto.check_out_date) || dto.check_out_date <= dto.check_in_date) {
    throw new DomainMappingError("INVALID_STAY_DATES");
  }
  const totalNights = dto.total_nights;
  if (!Number.isSafeInteger(totalNights) || totalNights <= 0) {
    throw new DomainMappingError("INVALID_TOTAL_NIGHTS");
  }

  if (totalNights !== (Date.parse(`${dto.check_out_date}T00:00:00Z`) - Date.parse(`${dto.check_in_date}T00:00:00Z`)) / 86400000) {
    throw new DomainMappingError("INCONSISTENT_TOTAL_NIGHTS");
  }
  if (!Array.isArray(dto.available_room_types)) throw new DomainMappingError("MISSING_AVAILABLE_ROOM_TYPES");
  const roomTypes = dto.available_room_types.map(mapRoomTypeDtoToDomain);

  return {
    propertyId: dto.property_id.trim(),
    checkInDate: dto.check_in_date.trim(),
    checkOutDate: dto.check_out_date.trim(),
    totalNights,
    roomTypes,
  };
}

export function mapSearchParamsToQueryDto(params: AvailabilitySearchParams): AvailabilitySearchQueryDto {
  return {
    property_id: params.propertyId,
    check_in_date: params.checkInDate,
    check_out_date: params.checkOutDate,
    adults: params.adults,
    children: params.children,
    rooms_count: params.roomsCount,
  };
}
