export interface RevenueKpiDaily {
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

export interface RevenueKpiSummary {
  occupancyPercent: number;
  adr: number;
  revPar: number;
  pickup: number;
  pace: number;
  totalRoomsSold: number;
  totalRoomsAvailable: number;
  totalRevenue: number;
}

export interface RevenueKpi {
  propertyId: string;
  currency: string;
  summary: RevenueKpiSummary;
  daily: RevenueKpiDaily[];
}

export interface RevenueKpiFilters {
  propertyId: string;
  startDate: string;
  endDate: string;
}
