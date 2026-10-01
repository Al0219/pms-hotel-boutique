/**
 * Public API for the rates module (WEB-4).
 * Regla de dominio: RatePlan no posee inventario físico.
 * Las restricciones tarifarias (CTA, CTD, MinLOS, StopSell) regulan condiciones de venta.
 */

export type {
  PricingModelDto,
  RatePlanDto,
  RatePlanListFiltersDto,
  RatePlanListResponseDto,
  RatePlanStatusDto,
} from "./dtos/rate-plan.dto";

export type {
  RateRestrictionDto,
  RateRestrictionQueryDto,
  UpdateRateRestrictionItemDto,
  BatchUpdateRateRestrictionsPayloadDto,
  RateRestrictionBatchResultDto,
} from "./dtos/rate-restriction.dto";

export type {
  PricingModel,
  RatePlan,
  RatePlanListFilters,
  RatePlanListResult,
  RatePlanStatus,
} from "./model/rate-plan";

export type {
  RateRestriction,
  RateRestrictionFilter,
  RateRestrictionUpdateItem,
  BatchUpdateRateRestrictionsParams,
  RateRestrictionBatchResult,
} from "./model/rate-restriction";

export {
  mapRatePlanDtoToDomain,
  mapRatePlanListFiltersToDto,
  mapRatePlanListResponseDtoToDomain,
} from "./mappers/rate-plan.mapper";

export {
  toDomainRateRestriction,
  toDtoRateRestrictionQuery,
  toDtoUpdateRestrictionItem,
  toDtoBatchUpdatePayload,
  toDomainRateRestrictionBatchResult,
} from "./mappers/rate-restriction.mapper";

export {
  useRateRestrictions,
  type UseRateRestrictionsResult,
} from "./hooks/use-rate-restrictions";

export {
  fetchRatePlanByIdDto,
  fetchRatePlansDto,
} from "./service/rate-plan.service";

export {
  fetchRateRestrictionsDto,
  batchUpdateRateRestrictionsDto,
} from "./service/rate-restriction.service";

export {
  RatesPage,
} from "./components/rates-page";

export {
  RatePlanListCard,
  type RatePlanListCardProps,
} from "./components/rate-plan-list-card";

export {
  RatePlanDetailModal,
  type RatePlanDetailModalProps,
} from "./components/rate-plan-detail-modal";

export {
  RateRestrictionsGrid,
  type RateRestrictionsGridProps,
} from "./components/rate-restrictions-grid";
