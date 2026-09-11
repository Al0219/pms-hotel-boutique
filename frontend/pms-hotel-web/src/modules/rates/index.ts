/**
 * Public API for the rates module (WEB-4).
 * Regla de dominio: RatePlan no posee inventario físico.
 */

export type {
  PricingModelDto,
  RatePlanDto,
  RatePlanListFiltersDto,
  RatePlanListResponseDto,
  RatePlanStatusDto,
} from "./dtos/rate-plan.dto";

export type {
  PricingModel,
  RatePlan,
  RatePlanListFilters,
  RatePlanListResult,
  RatePlanStatus,
} from "./model/rate-plan";

export {
  mapRatePlanDtoToDomain,
  mapRatePlanListFiltersToDto,
  mapRatePlanListResponseDtoToDomain,
} from "./mappers/rate-plan.mapper";

export {
  fetchRatePlanByIdDto,
  fetchRatePlansDto,
} from "./service/rate-plan.service";

export {
  RatePlanListCard,
  type RatePlanListCardProps,
} from "./components/rate-plan-list-card";

export {
  RatePlanDetailModal,
  type RatePlanDetailModalProps,
} from "./components/rate-plan-detail-modal";

