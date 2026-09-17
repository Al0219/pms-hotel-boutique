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
      roomBlockReference: "BLK-001", auditReference: "AUD-001",
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
});
