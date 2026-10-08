export interface PropertyReportMetrics {
  readonly occupancy: number;
  readonly adr: number;
  readonly revpar: number;
  readonly totalRevenue: number;
  readonly roomsSold: number;
  readonly roomsAvailable: number;
}

export interface PropertyReport {
  readonly propertyId: string;
  readonly propertyName: string;
  readonly dateRange: {
    readonly startDate: Date;
    readonly endDate: Date;
  };
  readonly metrics: PropertyReportMetrics;
  readonly currency: string;
  readonly timezone: string;
}

export interface PropertyReportSummary {
  readonly totalRevenue: number;
  readonly avgOccupancy: number;
  readonly avgAdr: number;
  readonly avgRevpar: number;
  readonly totalRoomsSold: number;
  readonly totalRoomsAvailable: number;
  readonly propertyCount: number;
}

export function summarizeReports(reports: ReadonlyArray<PropertyReport>): PropertyReportSummary {
  if (reports.length === 0) {
    return {
      totalRevenue: 0,
      avgOccupancy: 0,
      avgAdr: 0,
      avgRevpar: 0,
      totalRoomsSold: 0,
      totalRoomsAvailable: 0,
      propertyCount: 0,
    };
  }

  let totalRevenue = 0;
  let totalOccupancy = 0;
  let totalAdr = 0;
  let totalRevpar = 0;
  let totalRoomsSold = 0;
  let totalRoomsAvailable = 0;

  for (const report of reports) {
    totalRevenue += report.metrics.totalRevenue;
    totalOccupancy += report.metrics.occupancy;
    totalAdr += report.metrics.adr;
    totalRevpar += report.metrics.revpar;
    totalRoomsSold += report.metrics.roomsSold;
    totalRoomsAvailable += report.metrics.roomsAvailable;
  }

  const count = reports.length;

  return {
    totalRevenue,
    avgOccupancy: totalOccupancy / count,
    avgAdr: totalAdr / count,
    avgRevpar: totalRevpar / count,
    totalRoomsSold,
    totalRoomsAvailable,
    propertyCount: count,
  };
}
