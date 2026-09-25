import { describe, expect, it } from "vitest";

import { pickupRate, remainingBlockRooms } from "./group";

describe("pickup math", () => {
  it("computes pickup rate and remaining rooms", () => {
    const block = {
      reference: "BLK-001",
      startDate: new Date("2026-10-01T00:00:00"),
      endDate: new Date("2026-10-05T00:00:00"),
      roomsBlocked: 20,
      roomsPickedUp: 14,
    };

    expect(pickupRate(block)).toBeCloseTo(0.7);
    expect(remainingBlockRooms(block)).toBe(6);
  });

  it("reports zero pickup without blocked rooms", () => {
    const block = {
      reference: "BLK-001",
      startDate: new Date("2026-10-01T00:00:00"),
      endDate: new Date("2026-10-05T00:00:00"),
      roomsBlocked: 0,
      roomsPickedUp: 0,
    };

    expect(pickupRate(block)).toBe(0);
    expect(remainingBlockRooms(block)).toBe(0);
  });
});
