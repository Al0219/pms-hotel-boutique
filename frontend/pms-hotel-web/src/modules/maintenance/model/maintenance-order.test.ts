import { describe, expect, it } from "vitest";

import {
  isMaintenanceOrderStatus,
  isMaintenanceRoomImpact,
  resolveMaintenanceOrder,
  type MaintenanceOrder,
} from "./maintenance-order";

const ORDER: MaintenanceOrder = {
  id: "OT-001",
  propertyId: "GT-HB-01",
  roomId: "101",
  title: "Fuga en baño",
  status: "IN_PROGRESS",
  roomImpact: "OOO",
  history: [{ status: "OPEN", note: "Reportada por HK", actorReference: "HK-01" }],
};

describe("resolveMaintenanceOrder", () => {
  it("closes the order without restoring sellable availability", () => {
    const resolved = resolveMaintenanceOrder(ORDER);

    expect(resolved.status).toBe("RESOLVED");
    expect(resolved.roomImpact).toBe("OOO");
  });

  it("appends the resolution to the visible history", () => {
    const resolved = resolveMaintenanceOrder(ORDER);

    expect(resolved.history).toEqual([
      { status: "OPEN", note: "Reportada por HK", actorReference: "HK-01" },
      { status: "RESOLVED", note: null, actorReference: null },
    ]);
  });

  it("is idempotent for an already resolved order", () => {
    const resolved = resolveMaintenanceOrder(ORDER);

    expect(resolveMaintenanceOrder(resolved)).toBe(resolved);
  });
});

describe("maintenance guards", () => {
  it("recognizes only known statuses and impacts", () => {
    expect(isMaintenanceOrderStatus("OPEN")).toBe(true);
    expect(isMaintenanceOrderStatus("CLOSED")).toBe(false);
    expect(isMaintenanceRoomImpact("OOS")).toBe(true);
    expect(isMaintenanceRoomImpact("SOLD")).toBe(false);
  });
});
