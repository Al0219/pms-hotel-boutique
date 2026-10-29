import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import type { CurrentMaintenanceResponseDto } from "../dtos/current-maintenance.dto";
import type { CurrentMaintenanceReport } from "../model/current-maintenance";

const invalid = () => new DomainMappingError("INVALID_MAINTENANCE_REPORT");
const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw invalid();
  return value;
}
function count(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw invalid();
  return value;
}

export function mapCurrentMaintenanceReport(dto: CurrentMaintenanceResponseDto): CurrentMaintenanceReport {
  if (!dto || !Array.isArray(dto.rows)) throw invalid();
  const calculatedAt = text(dto.calculatedAt);
  if (!/^\d{4}-\d{2}-\d{2}T.*Z$/.test(calculatedAt) || !Number.isFinite(Date.parse(calculatedAt))) throw invalid();
  const seen = new Set<string>(), timezones = new Set<string>();
  return { calculatedAt, rows: dto.rows.map(value => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid();
    const propertyId = text(value.propertyId), timezone = text(value.timezone);
    if (!uuid.test(propertyId) || seen.has(propertyId.toLowerCase())) throw invalid();
    seen.add(propertyId.toLowerCase());
    if (!timezones.has(timezone)) {
      try { new Intl.DateTimeFormat("en", { timeZone: timezone }); } catch { throw invalid(); }
      timezones.add(timezone);
    }
    const openOrders = count(value.openOrders), inProgressOrders = count(value.inProgressOrders);
    const unresolvedOrders = count(value.unresolvedOrders), urgentUnresolvedOrders = count(value.urgentUnresolvedOrders);
    const unassignedUnresolvedOrders = count(value.unassignedUnresolvedOrders);
    const roomLinkedUnresolvedOrders = count(value.roomLinkedUnresolvedOrders);
    const commonAreaUnresolvedOrders = count(value.commonAreaUnresolvedOrders);
    if (unresolvedOrders !== openOrders + inProgressOrders ||
        unresolvedOrders !== roomLinkedUnresolvedOrders + commonAreaUnresolvedOrders ||
        urgentUnresolvedOrders > unresolvedOrders || unassignedUnresolvedOrders > unresolvedOrders) throw invalid();
    return { propertyId, timezone, openOrders, inProgressOrders, unresolvedOrders, urgentUnresolvedOrders,
      unassignedUnresolvedOrders, roomLinkedUnresolvedOrders, commonAreaUnresolvedOrders };
  }) };
}
