import { describe, expect, it } from "vitest";

import { buildDiscrepancies } from "./housekeeping-discrepancy";
import {
  allowedCleaningTransitions,
  canTransitionCleaning,
  cleaningTransitionRequiresReason,
} from "./room-cleaning-transition";

describe("room-cleaning-transition", () => {
  it("allows only the documented cleaning pipeline", () => {
    expect(allowedCleaningTransitions("DIRTY")).toEqual(["CLEAN"]);
    expect(allowedCleaningTransitions("CLEAN")).toEqual(["INSPECTED", "DIRTY"]);
    expect(allowedCleaningTransitions("INSPECTED")).toEqual(["DIRTY"]);
  });

  it("rejects jumps outside the pipeline", () => {
    expect(canTransitionCleaning("DIRTY", "INSPECTED")).toBe(false);
    expect(canTransitionCleaning("INSPECTED", "CLEAN")).toBe(false);
    expect(canTransitionCleaning("CLEAN", "CLEAN")).toBe(false);
  });

  it("requires a reason only when returning to DIRTY", () => {
    expect(cleaningTransitionRequiresReason("DIRTY")).toBe(true);
    expect(cleaningTransitionRequiresReason("CLEAN")).toBe(false);
    expect(cleaningTransitionRequiresReason("INSPECTED")).toBe(false);
  });
});

describe("buildDiscrepancies", () => {
  const rooms = [
    { id: "RM-101", propertyId: "GT-HB-01", number: "101", floor: "1", status: "ACTIVE", roomTypeLabel: "Estándar" },
    { id: "RM-103", propertyId: "GT-HB-01", number: "103", floor: "1", status: "OOO", roomTypeLabel: "Estándar" },
    { id: "RM-204", propertyId: "GT-HB-01", number: "204", floor: "2", status: "OOS", roomTypeLabel: "Deluxe" },
  ] as const;

  const cleaning = [
    { id: "RM-101", propertyId: "GT-HB-01", roomLabel: "101", status: "DIRTY" },
    { id: "RM-103", propertyId: "GT-HB-01", roomLabel: "103", status: "CLEAN" },
    { id: "RM-204", propertyId: "GT-HB-01", roomLabel: "204", status: "INSPECTED" },
  ] as const;

  it("flags sellable rooms that are dirty and blocked rooms that are ready", () => {
    const result = buildDiscrepancies([...rooms], [...cleaning], new Set());

    expect(result).toHaveLength(3);
    expect(result.find((entry) => entry.roomId === "RM-101")).toMatchObject({
      kind: "NOT_READY_FOR_SALE",
      frontOffice: "Vendible",
    });
    expect(result.find((entry) => entry.roomId === "RM-103")).toMatchObject({
      kind: "READY_BUT_BLOCKED",
      frontOffice: "Fuera de orden",
    });
    expect(result.find((entry) => entry.roomId === "RM-204")).toMatchObject({
      kind: "READY_BUT_BLOCKED",
      frontOffice: "Fuera de servicio",
    });
  });

  it("reports no discrepancy when FO and HK agree", () => {
    const result = buildDiscrepancies(
      [{ ...rooms[0], status: "ACTIVE" }],
      [{ ...cleaning[0], status: "CLEAN" }],
      new Set(),
    );

    expect(result).toHaveLength(0);
  });

  it("excludes already resolved rooms", () => {
    const result = buildDiscrepancies([...rooms], [...cleaning], new Set(["RM-101"]));

    expect(result.map((entry) => entry.roomId).sort()).toEqual(["RM-103", "RM-204"]);
  });

  it("ignores cleaning entries without a front-office counterpart", () => {
    const result = buildDiscrepancies(
      [],
      [{ id: "RM-999", propertyId: "GT-HB-01", roomLabel: "999", status: "DIRTY" }],
      new Set(),
    );

    expect(result).toHaveLength(0);
  });
});
