export interface DailyArrivalsDeparturesDay {
  readonly propertyId: string;
  readonly timezone: string;
  readonly currency: string;
  readonly date: string;
  readonly pendingArrivals: number;
  readonly pendingDepartures: number;
}

export interface DailyArrivalsDeparturesReport {
  readonly calculatedAt: string;
  readonly rows: readonly DailyArrivalsDeparturesDay[];
}

export function validArrivalsDeparturesRange(from: string, to: string): boolean {
  const first = Date.parse(`${from}T00:00:00.000Z`), last = Date.parse(`${to}T00:00:00.000Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to) &&
    Number.isFinite(first) && Number.isFinite(last) && first <= last &&
    new Date(first).toISOString().slice(0, 10) === from && new Date(last).toISOString().slice(0, 10) === to &&
    (last - first) / 86_400_000 < 366;
}
