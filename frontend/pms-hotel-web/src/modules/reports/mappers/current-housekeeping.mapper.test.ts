import { expect, it } from "vitest";
import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import type { CurrentHousekeepingResponseDto } from "../dtos/current-housekeeping.dto";
import { mapCurrentHousekeepingReport } from "./current-housekeeping.mapper";

const row = { propertyId: "22222222-2222-4222-8222-222222222222", timezone: "America/Guatemala", physicalRooms: 4,
  trackedRooms: 3, untrackedRooms: 1, dirtyRooms: 1, cleanRooms: 1, inspectedRooms: 1, dndRooms: 1 };
const dto = { calculatedAt: "2035-01-01T12:00:00Z", rows: [row] };
it("maps exact Backend counts, empty rows and physical zeros", () => {
  expect(mapCurrentHousekeepingReport(dto)).toEqual(dto);
  expect(mapCurrentHousekeepingReport({ ...dto, rows: [] }).rows).toEqual([]);
  const zero = { ...row, physicalRooms: 0, trackedRooms: 0, untrackedRooms: 0, dirtyRooms: 0,
    cleanRooms: 0, inspectedRooms: 0, dndRooms: 0 };
  expect(mapCurrentHousekeepingReport({ ...dto, rows: [zero] }).rows[0]).toEqual(zero);
});
it.each([null, {}, { ...dto, calculatedAt: "invalid" }, { ...dto, rows: [row, row] },
  ...[{ propertyId: "invalid" }, { timezone: "Invalid/Timezone" }, { physicalRooms: 3 }, { trackedRooms: 4 },
    { dndRooms: 4 }, { dirtyRooms: -1 }, { cleanRooms: 0.5 }, { untrackedRooms: null }]
    .map(patch => ({ ...dto, rows: [{ ...row, ...patch }] }))])("rejects malformed or inconsistent data", value => {
  expect(() => mapCurrentHousekeepingReport(value as CurrentHousekeepingResponseDto)).toThrow(DomainMappingError);
});
