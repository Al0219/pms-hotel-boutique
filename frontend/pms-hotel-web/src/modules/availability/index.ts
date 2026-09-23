/**
 * Public API for the availability module (WEB-4).
 * Export only intentionally public Domain Models, mappers and service functions.
 */

export type {
  AvailabilityMatrixQueryDto,
  AvailabilityMatrixResponseDto,
  DailyRoomTypeAvailabilityDto,
  PropertyDailySummaryDto,
  RoomTypeMatrixDto,
} from "./dtos/availability.dto";

export type {
  AvailabilityMatrixQuery,
  AvailabilityMatrixResult,
  AvailabilitySearchParams,
  AvailabilitySearchResult,
  AvailableRoomType,
  DailyRoomTypeAvailability,
  PropertyDailySummary,
  RatePlanOption,
  RoomTypeMatrix,
} from "./model/availability-option";

export {
  mapAvailabilityResponseToDomain,
  mapRatePlanDtoToDomain,
  mapRoomTypeDtoToDomain,
  mapSearchParamsToQueryDto,
} from "./mappers/availability.mapper";

export {
  mapAvailabilityMatrixQueryToDto,
  mapAvailabilityMatrixResponseToDomain,
  mapDailyRoomTypeAvailabilityDtoToDomain,
  mapPropertyDailySummaryDtoToDomain,
  mapRoomTypeMatrixDtoToDomain,
} from "./mappers/availability-matrix.mapper";


export {
  fetchAvailabilityDto,
} from "./service/availability.service";

export {
  fetchAvailabilityMatrixDto,
} from "./service/availability-matrix.service";

export {
  AvailabilityMatrixGrid,
  type AvailabilityMatrixGridProps,
} from "./components/availability-matrix-grid";

