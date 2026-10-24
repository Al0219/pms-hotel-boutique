import { describe, expect, it } from "vitest";

import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import type { DailyOnBooksResponseDto } from "../dtos/daily-on-books.dto";
import { mapDailyOnBooksReport } from "./daily-on-books.mapper";

const dto: DailyOnBooksResponseDto = { calculatedAt: "2035-01-01T12:00:00Z", rows: [{
  propertyId: "22222222-2222-4222-8222-222222222222", timezone: "America/Guatemala", currency: "GTQ",
  stayDate: "2035-01-01", physicalRooms: 3, outOfOrderRooms: 1, availableRooms: 2,
  onBooksRooms: 2, onBooksPercent: 100, unavailableReason: null,
}] };

describe("daily on-books mapper", () => {
  it("preserves the Backend percentage and zero-denominator reason", () => {
    expect(mapDailyOnBooksReport(dto).rows[0].onBooksPercent).toBe(100);
    const zero = { ...dto.rows[0], physicalRooms: 0, outOfOrderRooms: 0, availableRooms: 0,
      onBooksRooms: 0, onBooksPercent: null, unavailableReason: "NO_AVAILABLE_ROOMS" as const };
    expect(mapDailyOnBooksReport({ ...dto, rows: [zero] }).rows[0].unavailableReason).toBe("NO_AVAILABLE_ROOMS");
  });
  it("rejects inconsistent metrics", () => {
    expect(() => mapDailyOnBooksReport({ ...dto, rows: [{ ...dto.rows[0], availableRooms: 3 }] })).toThrow(DomainMappingError);
  });
});
