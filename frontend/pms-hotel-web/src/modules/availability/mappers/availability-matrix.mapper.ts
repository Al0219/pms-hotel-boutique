import { DomainMappingError } from "@/lib/errors";

import type {
  AvailabilityMatrixQueryDto,
  AvailabilityMatrixResponseDto,
  DailyRoomTypeAvailabilityDto,
  PropertyDailySummaryDto,
  RoomTypeMatrixDto,
} from "../dtos/availability.dto";
import type {
  AvailabilityMatrixQuery,
  AvailabilityMatrixResult,
  DailyRoomTypeAvailability,
  PropertyDailySummary,
  RoomTypeMatrix,
} from "../model/availability-option";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function mapAvailabilityMatrixQueryToDto(query: AvailabilityMatrixQuery): AvailabilityMatrixQueryDto {
  if (!query || !query.propertyId || !query.propertyId.trim()) {
    throw new DomainMappingError("MISSING_PROPERTY_ID");
  }

  if (!query.startDate || !DATE_REGEX.test(query.startDate)) {
    throw new DomainMappingError("INVALID_START_DATE");
  }

  if (!query.endDate || !DATE_REGEX.test(query.endDate)) {
    throw new DomainMappingError("INVALID_END_DATE");
  }

  if (query.startDate > query.endDate) {
    throw new DomainMappingError("START_DATE_AFTER_END_DATE");
  }

  return {
    property_id: query.propertyId.trim(),
    start_date: query.startDate,
    end_date: query.endDate,
    room_type_id: query.roomTypeId?.trim() || undefined,
  };
}

export function mapDailyRoomTypeAvailabilityDtoToDomain(dto: DailyRoomTypeAvailabilityDto): DailyRoomTypeAvailability {
  if (!dto || !dto.date || !DATE_REGEX.test(dto.date)) {
    throw new DomainMappingError("INVALID_DAILY_DATE");
  }

  const physicalRooms = Number(dto.physical_rooms);
  const soldRooms = Number(dto.sold_rooms);
  const oooRooms = Number(dto.ooo_rooms);
  const oosRooms = Number(dto.oos_rooms);
  const overbookingAdjustment = Number(dto.overbooking_adjustment ?? 0);
  const ats = Number(dto.ats);
  const occupancyRate = Number(dto.occupancy_rate);

  if (
    !Number.isFinite(physicalRooms) ||
    !Number.isFinite(soldRooms) ||
    !Number.isFinite(oooRooms) ||
    !Number.isFinite(oosRooms) ||
    !Number.isFinite(overbookingAdjustment) ||
    !Number.isFinite(ats) ||
    !Number.isFinite(occupancyRate)
  ) {
    throw new DomainMappingError("INVALID_MATRIX_NUMERIC_FIELD");
  }

  return {
    date: dto.date,
    physicalRooms,
    soldRooms,
    oooRooms,
    oosRooms,
    overbookingAdjustment,
    ats,
    occupancyRate,
    stopSell: Boolean(dto.stop_sell),
    minLos: dto.min_los !== undefined ? Number(dto.min_los) : undefined,
  };
}

export function mapRoomTypeMatrixDtoToDomain(dto: RoomTypeMatrixDto): RoomTypeMatrix {
  if (!dto || !dto.room_type_id || !dto.room_type_id.trim()) {
    throw new DomainMappingError("MISSING_ROOM_TYPE_ID");
  }

  if (!dto.room_type_name || !dto.room_type_name.trim()) {
    throw new DomainMappingError("MISSING_ROOM_TYPE_NAME");
  }

  const totalPhysicalCapacity = Number(dto.total_physical_capacity);
  if (!Number.isFinite(totalPhysicalCapacity) || totalPhysicalCapacity < 0) {
    throw new DomainMappingError("INVALID_TOTAL_PHYSICAL_CAPACITY");
  }

  const dailyAvailability = Array.isArray(dto.daily_availability)
    ? dto.daily_availability.map(mapDailyRoomTypeAvailabilityDtoToDomain)
    : [];

  return {
    roomTypeId: dto.room_type_id.trim(),
    roomTypeName: dto.room_type_name.trim(),
    roomTypeCode: (dto.room_type_code || "").trim(),
    totalPhysicalCapacity,
    dailyAvailability,
  };
}

export function mapPropertyDailySummaryDtoToDomain(dto: PropertyDailySummaryDto): PropertyDailySummary {
  if (!dto || !dto.date || !DATE_REGEX.test(dto.date)) {
    throw new DomainMappingError("INVALID_SUMMARY_DATE");
  }

  return {
    date: dto.date,
    totalPhysical: Number(dto.total_physical) || 0,
    totalSold: Number(dto.total_sold) || 0,
    totalOoo: Number(dto.total_ooo) || 0,
    totalOos: Number(dto.total_oos) || 0,
    totalAts: Number(dto.total_ats) || 0,
    averageOccupancyRate: Number(dto.average_occupancy_rate) || 0,
  };
}

export function mapAvailabilityMatrixResponseToDomain(dto: AvailabilityMatrixResponseDto): AvailabilityMatrixResult {
  if (!dto || !dto.property_id || !dto.property_id.trim()) {
    throw new DomainMappingError("MISSING_PROPERTY_ID");
  }

  if (!dto.start_date || !DATE_REGEX.test(dto.start_date)) {
    throw new DomainMappingError("INVALID_START_DATE");
  }

  if (!dto.end_date || !DATE_REGEX.test(dto.end_date)) {
    throw new DomainMappingError("INVALID_END_DATE");
  }

  const matrix = Array.isArray(dto.matrix) ? dto.matrix.map(mapRoomTypeMatrixDtoToDomain) : [];
  const dailySummaries = Array.isArray(dto.daily_summaries)
    ? dto.daily_summaries.map(mapPropertyDailySummaryDtoToDomain)
    : [];

  return {
    propertyId: dto.property_id.trim(),
    startDate: dto.start_date,
    endDate: dto.end_date,
    dates: Array.isArray(dto.dates) ? dto.dates : [],
    matrix,
    totalPropertyPhysicalRooms: Number(dto.total_property_physical_rooms) || 0,
    dailySummaries,
  };
}
