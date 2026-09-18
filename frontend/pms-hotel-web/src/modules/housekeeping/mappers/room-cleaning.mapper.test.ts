import { describe, expect, it } from "vitest";

import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import { mapRoomCleaning } from "./room-cleaning.mapper";

const DTO = {
  room_id: " RM-101 ",
  property_id: " GT-HB-01 ",
  room_label: " Habitación 101 ",
  cleaning_status: " DIRTY ",
};

describe("mapRoomCleaning", () => {
  it("maps and normalizes a provisional room cleaning DTO", () => {
    expect(mapRoomCleaning(DTO)).toEqual({
      id: "RM-101",
      propertyId: "GT-HB-01",
      roomLabel: "Habitación 101",
      status: "DIRTY",
    });
  });

  it("rejects an unknown cleaning status instead of mixing overlays", () => {
    expect(() => mapRoomCleaning({ ...DTO, cleaning_status: "DND" })).toThrow(
      new DomainMappingError("INVALID_ROOM_CLEANING_STATUS"),
    );
  });

  it("rejects a missing required room identifier", () => {
    expect(() => mapRoomCleaning({ ...DTO, room_id: " " })).toThrow(
      new DomainMappingError("INVALID_ROOM_CLEANING_ID"),
    );
  });
});
