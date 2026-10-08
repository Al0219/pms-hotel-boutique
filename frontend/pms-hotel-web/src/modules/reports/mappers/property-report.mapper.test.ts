import { describe, expect, it } from "vitest";

import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import { mapPropertyReport } from "./property-report.mapper";

const DTO = {
  property_id: " GT-HB-01 ",
  property_name: " Hotel Boutique Guatemala ",
  start_date: "2026-09-01",
  end_date: "2026-09-15",
  metrics: {
    occupancy: 0.78,
    adr: "1250.50",
    revpar: "975.39",
    total_revenue: "45000.00",
    rooms_sold: 156,
    rooms_available: 200,
  },
  currency: " GTQ ",
  timezone: " America/Guatemala ",
};

describe("mapPropertyReport", () => {
  it("maps and normalizes a provisional property report DTO", () => {
    const result = mapPropertyReport(DTO);

    expect(result).toEqual({
      propertyId: "GT-HB-01",
      propertyName: "Hotel Boutique Guatemala",
      dateRange: {
        startDate: new Date("2026-09-01T00:00:00"),
        endDate: new Date("2026-09-15T00:00:00"),
      },
      metrics: {
        occupancy: 0.78,
        adr: 1250.5,
        revpar: 975.39,
        totalRevenue: 45000,
        roomsSold: 156,
        roomsAvailable: 200,
      },
      currency: "GTQ",
      timezone: "America/Guatemala",
    });
  });

  it("rejects a missing property identifier", () => {
    expect(() => mapPropertyReport({ ...DTO, property_id: " " })).toThrow(
      new DomainMappingError("INVALID_REPORT_PROPERTY_ID"),
    );
  });

  it("rejects a missing property name", () => {
    expect(() => mapPropertyReport({ ...DTO, property_name: " " })).toThrow(
      new DomainMappingError("INVALID_REPORT_PROPERTY_NAME"),
    );
  });

  it("rejects an invalid start date format", () => {
    expect(() => mapPropertyReport({ ...DTO, start_date: "01/09/2026" })).toThrow(
      new DomainMappingError("INVALID_REPORT_START_DATE"),
    );
  });

  it("rejects a non-numeric total revenue", () => {
    expect(() => mapPropertyReport({
      ...DTO,
      metrics: { ...DTO.metrics, total_revenue: "abc" },
    })).toThrow(
      new DomainMappingError("INVALID_REPORT_TOTAL_REVENUE"),
    );
  });

  it("rejects a negative rooms sold count", () => {
    expect(() => mapPropertyReport({
      ...DTO,
      metrics: { ...DTO.metrics, rooms_sold: -1 },
    })).toThrow(
      new DomainMappingError("INVALID_REPORT_ROOMS_SOLD"),
    );
  });

  it("rejects a missing currency", () => {
    expect(() => mapPropertyReport({ ...DTO, currency: " " })).toThrow(
      new DomainMappingError("INVALID_REPORT_CURRENCY"),
    );
  });

  it("rejects a missing timezone", () => {
    expect(() => mapPropertyReport({ ...DTO, timezone: " " })).toThrow(
      new DomainMappingError("INVALID_REPORT_TIMEZONE"),
    );
  });
});
