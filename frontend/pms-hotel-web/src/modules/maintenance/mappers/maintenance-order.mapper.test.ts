import { describe, expect, it } from "vitest";

import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import { mapMaintenanceOrder } from "./maintenance-order.mapper";

const DTO = {
  order_id: " OT-001 ",
  property_id: " GT-HB-01 ",
  room_id: " 101 ",
  title: " Fuga en baño ",
  status: " OPEN ",
  room_impact: " OOO ",
  history: [{ status: " OPEN ", note: " Reportada por HK ", actor_reference: " HK-01 " }],
};

describe("mapMaintenanceOrder", () => {
  it("maps and normalizes a provisional maintenance order", () => {
    expect(mapMaintenanceOrder(DTO)).toEqual({
      id: "OT-001", propertyId: "GT-HB-01", roomId: "101", title: "Fuga en baño", status: "OPEN", roomImpact: "OOO",
      history: [{ status: "OPEN", note: "Reportada por HK", actorReference: "HK-01" }],
    });
  });

  it("keeps missing history notes as null", () => {
    expect(mapMaintenanceOrder({
      ...DTO, history: [{ status: "OPEN", note: null, actor_reference: null }],
    }).history[0]).toEqual({ status: "OPEN", note: null, actorReference: null });
  });

  it("rejects an unknown order status", () => {
    expect(() => mapMaintenanceOrder({ ...DTO, status: "CLOSED" })).toThrow(new DomainMappingError("INVALID_MAINTENANCE_ORDER_STATUS"));
  });

  it("rejects an unknown room impact", () => {
    expect(() => mapMaintenanceOrder({ ...DTO, room_impact: "SOLD" })).toThrow(new DomainMappingError("INVALID_MAINTENANCE_ROOM_IMPACT"));
  });

  it("rejects a missing required room identifier", () => {
    expect(() => mapMaintenanceOrder({ ...DTO, room_id: " " })).toThrow(new DomainMappingError("INVALID_MAINTENANCE_ORDER_ROOM_ID"));
  });
});
