import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { count, dateOnly, list, object, text } from "@/lib/validation";
import { calculateMetrics, stayDates, type ComparisonCriteria, type PropertyAvailability, type PropertyMetrics } from "../model/portfolio";

function money(raw: unknown) {
  const value = text(raw);
  if (!/^\d+(\.\d{1,2})?$/.test(value) || !Number.isFinite(Number(value))) throw new DomainMappingError("INVALID_AMOUNT");
  return Number(value);
}
function currency(raw: unknown) {
  const value = text(raw);
  if (!/^[A-Z]{3}$/.test(value)) throw new DomainMappingError("INVALID_CURRENCY");
  return value;
}
function scopedId(raw: unknown, ids: string[]) {
  const id = text(raw);
  if (!ids.includes(id)) throw new DomainMappingError("PROPERTY_OUTSIDE_SCOPE");
  return id;
}
function unique(ids: string[]) {
  if (new Set(ids).size !== ids.length) throw new DomainMappingError("DUPLICATE_PROPERTY_DATA");
}

export function mapPortfolio(raw: unknown, ids: string[]): PropertyMetrics[] {
  const rows = list(object(raw).metrics).map(value => {
    const item = object(value);
    return calculateMetrics({ propertyId: scopedId(item.property_id, ids), currency: currency(item.currency), date: dateOnly(item.date), roomsSold: count(item.sold_room_nights), roomsAvailable: count(item.available_room_nights), revenue: money(item.net_revenue) });
  });
  unique(rows.map(row => row.propertyId));
  return rows;
}

export function mapComparison(raw: unknown, ids: string[], criteria: ComparisonCriteria): PropertyAvailability[] {
  const dates = stayDates(criteria);
  if (!dates.length) throw new DomainMappingError("INVALID_STAY_RANGE");
  const rows = list(object(raw).options).map(value => {
    const item = object(value);
    const daily = list(item.daily).map(value => { const day = object(value); return { date: dateOnly(day.date), ats: count(day.ats) }; });
    if (daily.length !== dates.length || dates.some(date => daily.filter(day => day.date === date).length !== 1)) throw new DomainMappingError("INCOMPLETE_STAY_AVAILABILITY");
    return { propertyId: scopedId(item.property_id, ids), roomTypeId: text(item.room_type_id), roomTypeName: text(item.room_type_name), currency: currency(item.currency), nightlyRate: money(item.nightly_rate), daily: daily.sort((a, b) => a.date.localeCompare(b.date)), stayAts: Math.min(...daily.map(day => day.ats)) };
  });
  unique(rows.map(row => `${row.propertyId}:${row.roomTypeId}`));
  return rows;
}
