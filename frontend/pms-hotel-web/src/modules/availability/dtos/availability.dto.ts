/**
 * PROVISIONAL API CONTRACT - Availability
 * Corresponde a la tarea IMP-WEB-0102 (WEB-4).
 * Debe validarse contra Backend antes de marcar CONFIRMED.
 */

export interface AvailabilitySearchQueryDto {
  property_id?: string;
  check_in_date: string;
  check_out_date: string;
  adults: number;
  children: number;
  rooms_count: number;
}

export interface RatePlanOptionDto {
  rate_plan_id: string;
  rate_plan_name: string;
  description: string | null;
  base_nightly_rate: string;
  total_amount: string;
  currency: string;
  cancellation_policy: string;
  meals_included: string | null;
}

export interface AvailableRoomTypeDto {
  room_type_id: string;
  name: string;
  code: string;
  description: string | null;
  max_occupancy: number;
  available_rooms_count: number;
  rate_plans: RatePlanOptionDto[];
  images: string[];
}

export interface AvailabilityResponseDto {
  property_id: string;
  check_in_date: string;
  check_out_date: string;
  total_nights: number;
  available_room_types: AvailableRoomTypeDto[];
}
