/**
 * PROVISIONAL API CONTRACT - Rate Restrictions (WEB-4).
 * Regla de dominio: Las restricciones (CTA, CTD, MinLOS, StopSell) regulan las condiciones
 * de venta por tarifa y tipo de habitación, sin alterar ni eliminar inventario físico.
 */

export interface RateRestrictionDto {
  restriction_id: string;
  property_id: string;
  rate_plan_id: string;
  room_type_id: string;
  date: string; // YYYY-MM-DD
  closed_to_arrival: boolean; // CTA
  closed_to_departure: boolean; // CTD
  min_length_of_stay: number; // MinLOS (integer >= 1)
  stop_sell: boolean; // StopSell
  created_at: string;
  updated_at: string;
}

export interface RateRestrictionQueryDto {
  property_id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  rate_plan_id?: string;
  room_type_id?: string;
}

export interface UpdateRateRestrictionItemDto {
  rate_plan_id: string;
  room_type_id: string;
  date: string; // YYYY-MM-DD
  closed_to_arrival?: boolean;
  closed_to_departure?: boolean;
  min_length_of_stay?: number;
  stop_sell?: boolean;
}

export interface BatchUpdateRateRestrictionsPayloadDto {
  property_id: string;
  restrictions: UpdateRateRestrictionItemDto[];
}

export interface RateRestrictionBatchResultDto {
  success: boolean;
  updated_count: number;
  restrictions: RateRestrictionDto[];
  error_message?: string;
}
