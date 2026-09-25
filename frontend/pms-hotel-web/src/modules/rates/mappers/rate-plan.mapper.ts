import { DomainMappingError } from "@/lib/errors";

import type {
  PricingModelDto,
  RatePlanDto,
  RatePlanListFiltersDto,
  RatePlanListResponseDto,
  RatePlanStatusDto,
} from "../dtos/rate-plan.dto";
import type {
  PricingModel,
  RatePlan,
  RatePlanListFilters,
  RatePlanListResult,
  RatePlanStatus,
} from "../model/rate-plan";

const VALID_STATUSES: ReadonlySet<string> = new Set<RatePlanStatusDto>([
  "ACTIVE",
  "INACTIVE",
  "ARCHIVED",
]);

const VALID_MODELS: ReadonlySet<string> = new Set<PricingModelDto>([
  "PER_NIGHT",
  "PACKAGE",
  "DERIVED",
]);

export function mapRatePlanDtoToDomain(dto: RatePlanDto): RatePlan {
  if (!dto || typeof dto.rate_plan_id !== "string" || !dto.rate_plan_id.trim()) {
    throw new DomainMappingError("MISSING_RATE_PLAN_ID");
  }

  if (typeof dto.property_id !== "string" || !dto.property_id.trim()) {
    throw new DomainMappingError("MISSING_PROPERTY_ID");
  }

  if (typeof dto.code !== "string" || !dto.code.trim()) {
    throw new DomainMappingError("MISSING_RATE_PLAN_CODE");
  }

  if (typeof dto.name !== "string" || !dto.name.trim()) {
    throw new DomainMappingError("MISSING_RATE_PLAN_NAME");
  }

  if (!dto.status || !VALID_STATUSES.has(dto.status)) {
    throw new DomainMappingError("INVALID_RATE_PLAN_STATUS");
  }

  if (!dto.pricing_model || !VALID_MODELS.has(dto.pricing_model)) {
    throw new DomainMappingError("INVALID_PRICING_MODEL");
  }

  if (typeof dto.currency !== "string" || !dto.currency.trim()) {
    throw new DomainMappingError("MISSING_RATE_PLAN_CURRENCY");
  }

  const basePriceMultiplier = Number(dto.base_price_multiplier);
  if (!Number.isFinite(basePriceMultiplier) || basePriceMultiplier <= 0) {
    throw new DomainMappingError("INVALID_BASE_PRICE_MULTIPLIER");
  }

  const createdAt = new Date(dto.created_at);
  if (Number.isNaN(createdAt.getTime())) {
    throw new DomainMappingError("INVALID_RATE_PLAN_CREATED_AT");
  }

  const updatedAt = new Date(dto.updated_at);
  if (Number.isNaN(updatedAt.getTime())) {
    throw new DomainMappingError("INVALID_RATE_PLAN_UPDATED_AT");
  }

  const applicableRoomTypeIds = Array.isArray(dto.applicable_room_type_ids)
    ? dto.applicable_room_type_ids.map((id) => id.trim()).filter(Boolean)
    : [];

  return {
    ratePlanId: dto.rate_plan_id.trim(),
    propertyId: dto.property_id.trim(),
    code: dto.code.trim().toUpperCase(),
    name: dto.name.trim(),
    description: dto.description ?? null,
    status: dto.status as RatePlanStatus,
    pricingModel: dto.pricing_model as PricingModel,
    currency: dto.currency.trim().toUpperCase(),
    basePriceMultiplier,
    cancellationPolicy: dto.cancellation_policy?.trim() || "Estándar",
    mealsIncluded: dto.meals_included ?? null,
    applicableRoomTypeIds,
    createdAt,
    updatedAt,
  };
}

export function mapRatePlanListResponseDtoToDomain(dto: RatePlanListResponseDto): RatePlanListResult {
  if (!dto || !Array.isArray(dto.rate_plans)) {
    throw new DomainMappingError("INVALID_RATE_PLAN_LIST_RESPONSE");
  }

  const ratePlans = dto.rate_plans.map(mapRatePlanDtoToDomain);
  const totalCount = typeof dto.total_count === "number" ? dto.total_count : ratePlans.length;

  return {
    ratePlans,
    totalCount,
  };
}

export function mapRatePlanListFiltersToDto(filters?: RatePlanListFilters): RatePlanListFiltersDto | undefined {
  if (!filters) return undefined;

  return {
    property_id: filters.propertyId?.trim() || undefined,
    status: filters.status ? (filters.status as RatePlanStatusDto) : undefined,
    search: filters.search?.trim() || undefined,
  };
}
