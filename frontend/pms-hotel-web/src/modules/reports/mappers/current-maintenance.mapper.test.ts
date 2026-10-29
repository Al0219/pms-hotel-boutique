import { expect, it } from "vitest";
import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import type { CurrentMaintenanceResponseDto } from "../dtos/current-maintenance.dto";
import { mapCurrentMaintenanceReport } from "./current-maintenance.mapper";

const row = { propertyId: "22222222-2222-4222-8222-222222222222", timezone: "America/Guatemala",
  openOrders: 2, inProgressOrders: 1, unresolvedOrders: 3, urgentUnresolvedOrders: 1,
  unassignedUnresolvedOrders: 2, roomLinkedUnresolvedOrders: 2, commonAreaUnresolvedOrders: 1 };
const dto = { calculatedAt: "2035-01-01T12:00:00Z", rows: [row] };
it("maps real current counts, empty rows and zeros", () => {
  expect(mapCurrentMaintenanceReport(dto)).toEqual(dto);
  expect(mapCurrentMaintenanceReport({ ...dto, rows: [] }).rows).toEqual([]);
  const zero = { ...row, openOrders: 0, inProgressOrders: 0, unresolvedOrders: 0,
    urgentUnresolvedOrders: 0, unassignedUnresolvedOrders: 0, roomLinkedUnresolvedOrders: 0, commonAreaUnresolvedOrders: 0 };
  expect(mapCurrentMaintenanceReport({ ...dto, rows: [zero] }).rows[0]).toEqual(zero);
});
it.each([null, {}, { ...dto, calculatedAt: "invalid" }, { ...dto, rows: [row, row] },
  ...[{ propertyId: "invalid" }, { timezone: "Invalid/Timezone" }, { openOrders: 3 },
    { unresolvedOrders: 4 }, { urgentUnresolvedOrders: 4 }, { unassignedUnresolvedOrders: 4 },
    { roomLinkedUnresolvedOrders: 3 }, { inProgressOrders: -1 }, { commonAreaUnresolvedOrders: 0.5 }]
    .map(patch => ({ ...dto, rows: [{ ...row, ...patch }] }))])("rejects invalid or inconsistent data", value => {
  expect(() => mapCurrentMaintenanceReport(value as CurrentMaintenanceResponseDto)).toThrow(DomainMappingError);
});
