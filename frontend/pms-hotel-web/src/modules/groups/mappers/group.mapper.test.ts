import { describe, expect, it } from "vitest";

import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import { mapGroup } from "./group.mapper";

describe("mapGroup", () => {
  it("maps and normalizes a provisional group DTO", () => {
    expect(mapGroup({
      group_id: " GRP-001 ", property_id: " GT-HB-01 ", name: " Convención Maya ", lifecycle_status: " TENTATIVE ",
      room_block_reference: " BLK-001 ", audit_reference: " AUD-001 ",
    })).toEqual({
      id: "GRP-001", propertyId: "GT-HB-01", name: "Convención Maya", status: "TENTATIVE",
      roomBlockReference: "BLK-001", block: null, roomingList: [], auditReference: "AUD-001",
    });
  });

  it("keeps missing optional references as null", () => {
    expect(mapGroup({
      group_id: "GRP-001", property_id: "GT-HB-01", name: "Convención Maya", lifecycle_status: "INQUIRY",
      room_block_reference: " ", audit_reference: null,
    }).roomBlockReference).toBeNull();
  });

  it("rejects an unknown lifecycle status instead of presenting an invalid state", () => {
    expect(() => mapGroup({
      group_id: "GRP-001", property_id: "GT-HB-01", name: "Convención Maya", lifecycle_status: "CANCELLED",
      room_block_reference: null, audit_reference: null,
    })).toThrow(new DomainMappingError("INVALID_GROUP_LIFECYCLE_STATUS"));
  });

  it("rejects a missing required group identifier", () => {
    expect(() => mapGroup({
      group_id: " ", property_id: "GT-HB-01", name: "Convención Maya", lifecycle_status: "INQUIRY",
      room_block_reference: null, audit_reference: null,
    })).toThrow(new DomainMappingError("INVALID_GROUP_ID"));
  });

  it("maps a dated block with pickup and rooming list", () => {
    expect(mapGroup({
      group_id: "GRP-001", property_id: "GT-HB-01", name: "Convención Maya", lifecycle_status: "DEFINITE",
      room_block_reference: "BLK-001", audit_reference: null,
      block_start_date: "2026-10-01", block_end_date: "2026-10-05",
      rooms_blocked: 20, rooms_picked_up: 14,
      rooming_list: [{ entry_id: "RL-01", guest_name: " Ana Ruiz ", room_label: " 201 " }],
    })).toEqual({
      id: "GRP-001", propertyId: "GT-HB-01", name: "Convención Maya", status: "DEFINITE",
      roomBlockReference: "BLK-001",
      block: {
        reference: "BLK-001",
        startDate: new Date("2026-10-01T00:00:00"),
        endDate: new Date("2026-10-05T00:00:00"),
        roomsBlocked: 20,
        roomsPickedUp: 14,
      },
      roomingList: [{ id: "RL-01", guestName: "Ana Ruiz", roomLabel: "201" }],
      auditReference: null,
    });
  });

  it("rejects a pickup larger than the block", () => {
    expect(() => mapGroup({
      group_id: "GRP-001", property_id: "GT-HB-01", name: "Convención Maya", lifecycle_status: "DEFINITE",
      room_block_reference: "BLK-001", audit_reference: null,
      block_start_date: "2026-10-01", block_end_date: "2026-10-05",
      rooms_blocked: 10, rooms_picked_up: 11,
    })).toThrow(new DomainMappingError("INVALID_GROUP_BLOCK_PICKUP"));
  });

  it("rejects an incomplete block", () => {
    expect(() => mapGroup({
      group_id: "GRP-001", property_id: "GT-HB-01", name: "Convención Maya", lifecycle_status: "DEFINITE",
      room_block_reference: "BLK-001", audit_reference: null,
      block_start_date: "2026-10-01", block_end_date: null,
      rooms_blocked: 10, rooms_picked_up: 4,
    })).toThrow(new DomainMappingError("INVALID_GROUP_BLOCK"));
  });
});
