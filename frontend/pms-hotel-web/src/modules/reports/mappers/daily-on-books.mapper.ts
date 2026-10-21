import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import type { DailyOnBooksResponseDto } from "../dtos/daily-on-books.dto";
import type { DailyOnBooksReport, DailyOnBooksRow } from "../model/daily-on-books";

function requiredText(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new DomainMappingError("INVALID_ON_BOOKS_REPORT");
  return value;
}

function count(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new DomainMappingError("INVALID_ON_BOOKS_REPORT");
  return value;
}

function mapRow(value: unknown): DailyOnBooksRow {
  if (!value || typeof value !== "object") throw new DomainMappingError("INVALID_ON_BOOKS_REPORT");
  const row = value as Record<string, unknown>;
  const physicalRooms = count(row.physicalRooms);
  const outOfOrderRooms = count(row.outOfOrderRooms);
  const availableRooms = count(row.availableRooms);
  const onBooksRooms = count(row.onBooksRooms);
  const onBooksPercent = row.onBooksPercent;
  const unavailableReason = row.unavailableReason;
  if (availableRooms !== physicalRooms - outOfOrderRooms ||
    (availableRooms === 0 ? onBooksPercent !== null || unavailableReason !== "NO_AVAILABLE_ROOMS"
      : typeof onBooksPercent !== "number" || !Number.isFinite(onBooksPercent) || onBooksPercent < 0 || unavailableReason !== null)) {
    throw new DomainMappingError("INVALID_ON_BOOKS_REPORT");
  }
  const stayDate = requiredText(row.stayDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(stayDate)) throw new DomainMappingError("INVALID_ON_BOOKS_REPORT");
  return { propertyId: requiredText(row.propertyId), timezone: requiredText(row.timezone), currency: requiredText(row.currency),
    stayDate, physicalRooms, outOfOrderRooms, availableRooms, onBooksRooms,
    onBooksPercent: onBooksPercent as number | null, unavailableReason: unavailableReason as "NO_AVAILABLE_ROOMS" | null };
}

export function mapDailyOnBooksReport(dto: DailyOnBooksResponseDto): DailyOnBooksReport {
  if (!dto || !Array.isArray(dto.rows)) throw new DomainMappingError("INVALID_ON_BOOKS_REPORT");
  const calculatedAt = requiredText(dto.calculatedAt);
  if (Number.isNaN(Date.parse(calculatedAt))) throw new DomainMappingError("INVALID_ON_BOOKS_REPORT");
  return { calculatedAt, rows: dto.rows.map(mapRow) };
}
