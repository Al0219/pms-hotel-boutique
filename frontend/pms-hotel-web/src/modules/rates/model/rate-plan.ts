/**
 * Domain Models for Rate Plans (WEB-4).
 * Reglas de negocio:
 * - RatePlan != Physical Inventory.
 * - Fechas como instancias de Date.
 * - Estados comerciales: ACTIVE, INACTIVE, ARCHIVED.
 */

export type RatePlanStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type PricingModel = "PER_NIGHT" | "PACKAGE" | "DERIVED";

export interface RatePlan {
  ratePlanId: string;
  propertyId: string;
  code: string;
  name: string;
  description: string | null;
  status: RatePlanStatus;
  pricingModel: PricingModel;
  currency: string;
  basePriceMultiplier: number;
  cancellationPolicy: string;
  mealsIncluded: string | null;
  applicableRoomTypeIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RatePlanListFilters {
  propertyId?: string;
  status?: RatePlanStatus;
  search?: string;
}

export interface RatePlanListResult {
  ratePlans: RatePlan[];
  totalCount: number;
}
