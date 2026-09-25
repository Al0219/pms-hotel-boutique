import { describe, expect, it } from "vitest";

import {
  allowedRoomStatusChanges,
  canChangeRoomStatus,
  isValidBlockPeriod,
  roomStatusChangeRequiresPeriod,
} from "./room-status-change";

describe("room-status-change", () => {
  it("allows blocking, moving between blocks and releasing", () => {
    expect(allowedRoomStatusChanges("ACTIVE")).toEqual(["OOO", "OOS"]);
    expect(allowedRoomStatusChanges("OOO")).toEqual(["ACTIVE", "OOS"]);
    expect(allowedRoomStatusChanges("OOS")).toEqual(["ACTIVE", "OOO"]);
  });

  it("rejects no-op transitions", () => {
    expect(canChangeRoomStatus("ACTIVE", "ACTIVE")).toBe(false);
    expect(canChangeRoomStatus("OOO", "OOO")).toBe(false);
  });

  it("requires a period only when blocking", () => {
    expect(roomStatusChangeRequiresPeriod("OOO")).toBe(true);
    expect(roomStatusChangeRequiresPeriod("OOS")).toBe(true);
    expect(roomStatusChangeRequiresPeriod("ACTIVE")).toBe(false);
  });

  it("validates block periods with end strictly after start", () => {
    expect(isValidBlockPeriod("2026-09-20", "2026-09-25")).toBe(true);
    expect(isValidBlockPeriod("2026-09-25", "2026-09-25")).toBe(false);
    expect(isValidBlockPeriod("2026-09-26", "2026-09-25")).toBe(false);
    expect(isValidBlockPeriod("20-09-2026", "2026-09-25")).toBe(false);
  });
});
