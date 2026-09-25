import { describe, expect, it } from "vitest";

import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import { mapRoomStatusChangeResult } from "./room-status-change.mapper";

describe("mapRoomStatusChangeResult", () => {
  it("maps a block with its period", () => {
    expect(
      mapRoomStatusChangeResult({
        room_id: "ROOM-103",
        property_id: "GT-HB-01",
        status: " OOO ",
        blocked_from: "2026-09-20",
        blocked_to: "2026-09-25",
      }),
    ).toEqual({
      roomId: "ROOM-103",
      propertyId: "GT-HB-01",
      status: "OOO",
      blockedFrom: new Date("2026-09-20T00:00:00"),
      blockedTo: new Date("2026-09-25T00:00:00"),
    });
  });

  it("maps a release without a period", () => {
    expect(
      mapRoomStatusChangeResult({
        room_id: "ROOM-103",
        property_id: "GT-HB-01",
        status: "ACTIVE",
        blocked_from: null,
        blocked_to: null,
      }),
    ).toMatchObject({ status: "ACTIVE", blockedFrom: null, blockedTo: null });
  });

  it("rejects an unknown status", () => {
    expect(() =>
      mapRoomStatusChangeResult({
        room_id: "ROOM-103",
        property_id: "GT-HB-01",
        status: "RENOVATION",
        blocked_from: null,
        blocked_to: null,
      }),
    ).toThrow(DomainMappingError);
  });

  it("rejects a malformed block date", () => {
    expect(() =>
      mapRoomStatusChangeResult({
        room_id: "ROOM-103",
        property_id: "GT-HB-01",
        status: "OOS",
        blocked_from: "ayer",
        blocked_to: null,
      }),
    ).toThrow(DomainMappingError);
  });
});
