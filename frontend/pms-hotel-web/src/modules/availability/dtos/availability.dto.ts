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

export interface AvailabilityMatrixQueryDto {
  property_id: string;
  start_date: string;
  end_date: string;
  room_type_id?: string;
}

export interface DailyRoomTypeAvailabilityDto {
  date: string;
  physical_rooms: number;
  sold_rooms: number;
  ooo_rooms: number;
  oos_rooms: number;
  overbooking_adjustment: number;
  ats: number;
  occupancy_rate: number;
  stop_sell?: boolean;
  min_los?: number;
}

export interface RoomTypeMatrixDto {
  room_type_id: string;
  room_type_name: string;
  room_type_code: string;
  total_physical_capacity: number;
  daily_availability: DailyRoomTypeAvailabilityDto[];
}

export interface PropertyDailySummaryDto {
  date: string;
  total_physical: number;
  total_sold: number;
  total_ooo: number;
  total_oos: number;
  total_ats: number;
  average_occupancy_rate: number;
}

export interface AvailabilityMatrixResponseDto {
  property_id: string;
  start_date: string;
  end_date: string;
  dates: string[];
  matrix: RoomTypeMatrixDto[];
  total_property_physical_rooms: number;
  daily_summaries: PropertyDailySummaryDto[];
}

