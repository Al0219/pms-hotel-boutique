/**
 * PROVISIONAL API CONTRACT - Rate Plans (WEB-4).
 * Regla de dominio: RatePlan no posee inventario físico.
 */

export type RatePlanStatusDto = "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type PricingModelDto = "PER_NIGHT" | "PACKAGE" | "DERIVED";

export interface RatePlanDto {
  rate_plan_id: string;
  property_id: string;
  code: string;
  name: string;
  description: string | null;
  status: RatePlanStatusDto;
  pricing_model: PricingModelDto;
  currency: string;
  base_price_multiplier: number;
  cancellation_policy: string;
  meals_included: string | null;
  applicable_room_type_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface RatePlanListFiltersDto {
  property_id?: string;
  status?: RatePlanStatusDto;
  search?: string;
}

export interface RatePlanListResponseDto {
  rate_plans: RatePlanDto[];
  total_count: number;
}
