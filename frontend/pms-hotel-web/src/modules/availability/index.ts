/**
 * Public API for the availability module (WEB-4).
 * Export only intentionally public Domain Models, mappers and service functions.
 */

export type {
  AvailabilitySearchParams,
  AvailabilitySearchResult,
  AvailableRoomType,
  RatePlanOption,
} from "./model/availability-option";

export {
  mapAvailabilityResponseToDomain,
  mapRatePlanDtoToDomain,
  mapRoomTypeDtoToDomain,
  mapSearchParamsToQueryDto,
} from "./mappers/availability.mapper";

export {
  fetchAvailabilityDto,
} from "./service/availability.service";
