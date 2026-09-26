export interface PropertyMetrics {
  propertyId: string;
  currency: string;
  date: string;
  roomsSold: number;
  roomsAvailable: number;
  revenue: number;
  occupancy: number | null;
  adr: number | null;
  revpar: number | null;
}

/** Weighted portfolio presentation of the existing fixture snapshot, grouped by currency/date. */
export function consolidateMetrics(rows: PropertyMetrics[]): PropertyMetrics[] {
  const groups = new Map<string, PropertyMetrics>();
  for (const row of rows) {
    const key = `${row.currency}:${row.date}`;
    const current = groups.get(key) ?? { ...row, propertyId: "portfolio", roomsSold: 0, roomsAvailable: 0, revenue: 0 };
    current.roomsSold += row.roomsSold;
    current.roomsAvailable += row.roomsAvailable;
    current.revenue += row.revenue;
    groups.set(key, current);
  }
  return [...groups.values()].map(calculateMetrics);
}

export function calculateMetrics(row: Omit<PropertyMetrics, "occupancy" | "adr" | "revpar">): PropertyMetrics {
  return {
    ...row,
    occupancy: row.roomsAvailable ? row.roomsSold / row.roomsAvailable * 100 : null,
    adr: row.roomsSold ? row.revenue / row.roomsSold : null,
    revpar: row.roomsAvailable ? row.revenue / row.roomsAvailable : null,
  };
}

export interface ComparisonCriteria { startDate: string; endDate: string; roomType: string; }
export interface PropertyAvailability {
  propertyId: string;
  roomTypeId: string;
  roomTypeName: string;
  currency: string;
  nightlyRate: number;
  daily: { date: string; ats: number }[];
  stayAts: number;
}

export function stayDates(criteria: ComparisonCriteria): string[] {
  for (const value of [criteria.startDate, criteria.endDate]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) return [];
  }
  const start = Date.parse(criteria.startDate), end = Date.parse(criteria.endDate);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];
  const nights = (end - start) / 86400000;
  // Limit only the demo form to avoid unbounded browser rendering.
  if (!Number.isInteger(nights) || nights > 31) return [];
  return Array.from({ length: nights }, (_, i) => new Date(start + i * 86400000).toISOString().slice(0, 10));
}
