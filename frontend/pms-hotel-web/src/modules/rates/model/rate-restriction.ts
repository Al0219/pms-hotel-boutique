/**
 * DOMAIN MODEL - Rate Restrictions (WEB-4).
 * Modelo de negocio para gestión de CTA, CTD, MinLOS y Stop Sell.
 */

export interface RateRestriction {
  restrictionId: string;
  propertyId: string;
  ratePlanId: string;
  roomTypeId: string;
  date: string; // ISO date string YYYY-MM-DD
  closedToArrival: boolean; // CTA
  closedToDeparture: boolean; // CTD
  minLengthOfStay: number; // MinLOS (>= 1)
  stopSell: boolean; // StopSell
  createdAt: Date;
  updatedAt: Date;
}

export interface RateRestrictionFilter {
  propertyId: string;
  startDate: string;
  endDate: string;
  ratePlanId?: string;
  roomTypeId?: string;
}

export interface RateRestrictionUpdateItem {
  ratePlanId: string;
  roomTypeId: string;
  date: string;
  closedToArrival?: boolean;
  closedToDeparture?: boolean;
  minLengthOfStay?: number;
  stopSell?: boolean;
}

export interface BatchUpdateRateRestrictionsParams {
  propertyId: string;
  restrictions: RateRestrictionUpdateItem[];
}

export interface RateRestrictionBatchResult {
  success: boolean;
  updatedCount: number;
  restrictions: RateRestriction[];
  errorMessage?: string;
}
