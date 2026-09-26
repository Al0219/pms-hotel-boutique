/** Private 09 frontend fixture snapshot, not a confirmed Revenue/Availability API. */
export interface PortfolioDTO {
  metrics: { property_id: string; currency: string; date: string; sold_room_nights: number; available_room_nights: number; net_revenue: string }[];
}
export interface ComparisonDTO {
  options: { property_id: string; room_type_id: string; room_type_name: string; currency: string; nightly_rate: string; daily: { date: string; ats: number }[] }[];
}
