import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import type { CurrentHousekeepingResponseDto } from "../dtos/current-housekeeping.dto";
import type { CurrentHousekeepingReport } from "../model/current-housekeeping";

const invalid = () => new DomainMappingError("INVALID_HOUSEKEEPING_REPORT");
function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw invalid();
  return value;
}
function count(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw invalid();
  return value;
}

export function mapCurrentHousekeepingReport(dto: CurrentHousekeepingResponseDto): CurrentHousekeepingReport {
  if (!dto || !Array.isArray(dto.rows)) throw invalid();
  const calculatedAt = text(dto.calculatedAt);
  if (!/^\d{4}-\d{2}-\d{2}T.*Z$/.test(calculatedAt) || !Number.isFinite(Date.parse(calculatedAt))) throw invalid();
  const seen = new Set<string>(), timezones = new Set<string>();
  return { calculatedAt, rows: dto.rows.map(value => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid();
    const propertyId = text(value.propertyId), timezone = text(value.timezone);
    if (!/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(propertyId) || seen.has(propertyId.toLowerCase())) throw invalid();
    seen.add(propertyId.toLowerCase());
    if (!timezones.has(timezone)) {
      try { new Intl.DateTimeFormat("en", { timeZone: timezone }); } catch { throw invalid(); }
      timezones.add(timezone);
    }
    const physicalRooms = count(value.physicalRooms), trackedRooms = count(value.trackedRooms), untrackedRooms = count(value.untrackedRooms);
    const dirtyRooms = count(value.dirtyRooms), cleanRooms = count(value.cleanRooms), inspectedRooms = count(value.inspectedRooms), dndRooms = count(value.dndRooms);
    if (physicalRooms !== trackedRooms + untrackedRooms || trackedRooms !== dirtyRooms + cleanRooms + inspectedRooms || dndRooms > trackedRooms) throw invalid();
    return { propertyId, timezone, physicalRooms, trackedRooms, untrackedRooms, dirtyRooms, cleanRooms, inspectedRooms, dndRooms };
  }) };
}
