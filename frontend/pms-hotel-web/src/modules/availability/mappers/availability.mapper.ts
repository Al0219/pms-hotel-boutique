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
  if (value === undefined || value === null || value.trim() === "") {
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

  if (typeof dto.currency !== "string" || !dto.currency.trim()) {
    throw new DomainMappingError("MISSING_CURRENCY");
  }

  return {
    ratePlanId: dto.rate_plan_id.trim(),
    name: dto.rate_plan_name.trim(),
    description: dto.description ?? null,
    baseNightlyRate: parseMoneyAmount(dto.base_nightly_rate, "base_nightly_rate"),
    totalAmount: parseMoneyAmount(dto.total_amount, "total_amount"),
    currency: dto.currency.trim().toUpperCase(),
    cancellationPolicy: dto.cancellation_policy ?? "Non-refundable",
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

  const maxOccupancy = Number(dto.max_occupancy);
  if (!Number.isInteger(maxOccupancy) || maxOccupancy <= 0) {
    throw new DomainMappingError("INVALID_MAX_OCCUPANCY");
  }

  const availableRoomsCount = Number(dto.available_rooms_count);
  if (!Number.isInteger(availableRoomsCount) || availableRoomsCount < 0) {
    throw new DomainMappingError("INVALID_AVAILABLE_ROOMS_COUNT");
  }

  const ratePlans = Array.isArray(dto.rate_plans)
    ? dto.rate_plans.map(mapRatePlanDtoToDomain)
    : [];

  return {
    roomTypeId: dto.room_type_id.trim(),
    name: dto.name.trim(),
    code: dto.code.trim(),
    description: dto.description ?? null,
    maxOccupancy,
    availableRoomsCount,
    ratePlans,
    images: Array.isArray(dto.images) ? [...dto.images] : [],
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

  const totalNights = Number(dto.total_nights);
  if (!Number.isInteger(totalNights) || totalNights <= 0) {
    throw new DomainMappingError("INVALID_TOTAL_NIGHTS");
  }

  const roomTypes = Array.isArray(dto.available_room_types)
    ? dto.available_room_types.map(mapRoomTypeDtoToDomain)
    : [];

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
