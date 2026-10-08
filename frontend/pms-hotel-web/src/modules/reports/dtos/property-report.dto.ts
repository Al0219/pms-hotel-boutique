/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 */
export interface PropertyReportMetricsDto {
  occupancy: number;
  adr: string;
  revpar: string;
  total_revenue: string;
  rooms_sold: number;
  rooms_available: number;
}

/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 */
export interface PropertyReportDto {
  property_id: string;
  property_name: string;
  start_date: string;
  end_date: string;
  metrics: PropertyReportMetricsDto;
  currency: string;
  timezone: string;
}

/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 */
export interface PropertyReportListDto {
  reports: PropertyReportDto[];
}
