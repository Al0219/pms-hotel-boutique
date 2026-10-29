import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import type { DailyArrivalsDeparturesResponseDto } from "../dtos/daily-arrivals-departures.dto";
import { validArrivalsDeparturesRange, type DailyArrivalsDeparturesReport } from "../model/daily-arrivals-departures";

const invalid = () => new DomainMappingError("INVALID_ARRIVALS_DEPARTURES_REPORT");
function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw invalid();
  return value;
}
function count(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw invalid();
  return value;
}

export function mapDailyArrivalsDeparturesReport(dto: DailyArrivalsDeparturesResponseDto): DailyArrivalsDeparturesReport {
  if (!dto || !Array.isArray(dto.rows) || dto.rows.length > 50_000) throw invalid();
  const calculatedAt = text(dto.calculatedAt);
  if (!/^\d{4}-\d{2}-\d{2}T.*Z$/.test(calculatedAt) || !Number.isFinite(Date.parse(calculatedAt))) throw invalid();
  const seen = new Set<string>(), timezones = new Set<string>();
  return { calculatedAt, rows: dto.rows.map(value => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid();
    const propertyId = text(value.propertyId), timezone = text(value.timezone), currency = text(value.currency), date = text(value.date);
    if (!/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(propertyId) || !/^[A-Z]{3}$/.test(currency) ||
      !validArrivalsDeparturesRange(date, date)) throw invalid();
    if (!timezones.has(timezone)) {
      try { new Intl.DateTimeFormat("en", { timeZone: timezone }); } catch { throw invalid(); }
      timezones.add(timezone);
    }
    const key = `${propertyId.toLowerCase()}:${date}`;
    if (seen.has(key)) throw invalid();
    seen.add(key);
    return { propertyId, timezone, currency, date, pendingArrivals: count(value.pendingArrivals), pendingDepartures: count(value.pendingDepartures) };
  }) };
}
