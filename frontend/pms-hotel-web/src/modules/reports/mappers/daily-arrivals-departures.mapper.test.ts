import { expect, it } from "vitest";
import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import type { DailyArrivalsDeparturesResponseDto } from "../dtos/daily-arrivals-departures.dto";
import { validArrivalsDeparturesRange } from "../model/daily-arrivals-departures";
import { mapDailyArrivalsDeparturesReport } from "./daily-arrivals-departures.mapper";

const row = { propertyId: "22222222-2222-4222-8222-222222222222", timezone: "America/Guatemala", currency: "GTQ", date: "2035-01-01", pendingArrivals: 0, pendingDepartures: 3 };
const dto = { calculatedAt: "2035-01-01T12:00:00Z", rows: [row] };
it("maps exact Backend values without invented actual counts and preserves empty/zero", () => {
  expect(mapDailyArrivalsDeparturesReport(dto)).toEqual(dto);
  expect(mapDailyArrivalsDeparturesReport({ ...dto, rows: [] }).rows).toEqual([]);
});
it.each([null, {}, { ...dto, calculatedAt: "invalid" }, { ...dto, rows: [row, row] },
  ...[{ propertyId: "invalid" }, { date: "2035-02-30" }, { timezone: "Invalid/Timezone" }, { currency: "gtq" },
    { pendingArrivals: null }, { pendingDepartures: -1 }, { pendingArrivals: 0.5 }, { pendingArrivals: Number.MAX_SAFE_INTEGER + 1 }]
    .map(patch => ({ ...dto, rows: [{ ...row, ...patch }] }))])("rejects malformed data with DomainMappingError", value => {
  expect(() => mapDailyArrivalsDeparturesReport(value as DailyArrivalsDeparturesResponseDto)).toThrow(DomainMappingError);
});
it("validates calendar days and inclusive 366-day limit", () => {
  expect(validArrivalsDeparturesRange("2035-01-01", "2036-01-01")).toBe(true);
  expect(validArrivalsDeparturesRange("2035-01-01", "2036-01-02")).toBe(false);
  expect(validArrivalsDeparturesRange("2035-02-30", "2035-03-01")).toBe(false);
  expect(validArrivalsDeparturesRange("2035-01-02", "2035-01-01")).toBe(false);
});
