export interface RevenueKpiDailyDto {
  date: string;
  occupancyPercent: number;
  adr: number;
  revPar: number;
  pickup: number;
  pace: number;
  roomsSold: number;
  roomsAvailable: number;
  revenue: number;
}

export interface RevenueKpiSummaryDto {
  occupancyPercent: number;
  adr: number;
  revPar: number;
  pickup: number;
  pace: number;
  totalRoomsSold: number;
  totalRoomsAvailable: number;
  totalRevenue: number;
}

export interface RevenueKpiResponseDto {
  propertyId: string;
  currency: string;
  summary: RevenueKpiSummaryDto;
  daily: RevenueKpiDailyDto[];
}
