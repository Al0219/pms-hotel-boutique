import { describe, expect, it } from "vitest";

import type { PropertyReport } from "./property-report";
import { EMPTY_REPORT_FILTERS, filterReports } from "./report-filters";
import { buildReportsCsv } from "./reports-export";
import { deleteSavedReport, loadSavedReports, saveSavedReport } from "./saved-report";
import { summarizeReports } from "./property-report";

function report(overrides: Partial<PropertyReport> = {}): PropertyReport {
  return {
    propertyId: "GT-HB-01",
    propertyName: "Hotel Boutique Guatemala",
    dateRange: { startDate: new Date("2026-09-01T00:00:00"), endDate: new Date("2026-09-15T00:00:00") },
    metrics: { occupancy: 0.78, adr: 1250.5, revpar: 975.39, totalRevenue: 45000, roomsSold: 156, roomsAvailable: 200 },
    currency: "GTQ",
    timezone: "America/Guatemala",
    ...overrides,
  };
}

describe("filterReports", () => {
  const reports = [
    report(),
    report({ propertyId: "GT-HB-02", propertyName: "Hotel Lake Atitlán" }),
  ];

  it("returns everything without filters", () => {
    expect(filterReports(reports, EMPTY_REPORT_FILTERS)).toHaveLength(2);
  });

  it("filters by property name", () => {
    expect(filterReports(reports, { ...EMPTY_REPORT_FILTERS, query: "atitlán" })).toHaveLength(1);
  });

  it("filters by overlapping date range", () => {
    expect(filterReports(reports, { ...EMPTY_REPORT_FILTERS, from: "2026-09-10", to: "2026-09-20" })).toHaveLength(2);
    expect(filterReports(reports, { ...EMPTY_REPORT_FILTERS, from: "2026-09-16" })).toHaveLength(0);
    expect(filterReports(reports, { ...EMPTY_REPORT_FILTERS, to: "2026-08-31" })).toHaveLength(0);
  });
});

describe("summarizeReports", () => {
  it("aggregates totals and averages", () => {
    const summary = summarizeReports([
      report(),
      report({ metrics: { occupancy: 0.6, adr: 1000, revpar: 600, totalRevenue: 30000, roomsSold: 100, roomsAvailable: 200 } }),
    ]);

    expect(summary).toMatchObject({
      totalRevenue: 75000,
      avgOccupancy: 0.69,
      avgAdr: 1125.25,
      totalRoomsSold: 256,
      totalRoomsAvailable: 400,
      propertyCount: 2,
    });
  });

  it("returns zeros without reports", () => {
    expect(summarizeReports([])).toMatchObject({ totalRevenue: 0, propertyCount: 0 });
  });
});

describe("buildReportsCsv", () => {
  it("builds a semicolon-separated export with header", () => {
    const csv = buildReportsCsv([report()]).split("\n");

    expect(csv[0]).toBe("propiedad;desde;hasta;ocupacion;adr;revpar;ingresos_totales;habitaciones_vendidas;habitaciones_disponibles;moneda");
    expect(csv[1]).toContain("Hotel Boutique Guatemala;2026-09-01;2026-09-15");
    expect(csv[1]).toContain("GTQ");
  });

  it("quotes cells with separators", () => {
    const csv = buildReportsCsv([report({ propertyName: 'Hotel "Lago; Azul"' })]);

    expect(csv).toContain('"Hotel ""Lago; Azul"""');
  });
});

describe("saved reports store", () => {
  it("saves, loads and deletes views with their schedule", () => {
    localStorage.clear();

    const saved = saveSavedReport({
      name: "Septiembre",
      filters: { query: "", from: "2026-09-01", to: "2026-09-30" },
      schedule: "WEEKLY",
    });

    expect(loadSavedReports()).toHaveLength(1);
    expect(saved).toMatchObject({ name: "Septiembre", schedule: "WEEKLY" });
    expect(deleteSavedReport(saved.id)).toHaveLength(0);
    expect(loadSavedReports()).toHaveLength(0);

    localStorage.clear();
  });
});
