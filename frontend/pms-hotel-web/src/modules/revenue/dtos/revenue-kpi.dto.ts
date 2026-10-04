export interface RevenueKpiDailyDto {
  date: string;
  occupancy_percent: number;
  adr: number;
  rev_par: number;
  pickup: number;
  pace: number;
  rooms_sold: number;
  rooms_available: number;
  revenue: number;
}

export interface RevenueKpiSummaryDto {
  occupancy_percent: number;
  adr: number;
  rev_par: number;
  pickup: number;
  pace: number;
  total_rooms_sold: number;
  total_rooms_available: number;
  total_revenue: number;
}

export interface RevenueKpiResponseDto {
  property_id: string;
  currency: string;
  summary: RevenueKpiSummaryDto;
  daily: RevenueKpiDailyDto[];
}

export interface RevenueKpiRequestDto {
  property_id: string;
  start_date: string;
  end_date: string;
}
