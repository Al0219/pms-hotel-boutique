import { describe, expect, it } from "vitest";

import {
  canTransitionGroup,
  GROUP_LIFECYCLE,
  isGroupLifecycleStatus,
  nextGroupStatus,
  type GroupLifecycleStatus,
} from "./group-lifecycle";

describe("group lifecycle", () => {
  it("only offers the immediate next status", () => {
    expect(nextGroupStatus("INQUIRY")).toBe("TENTATIVE");
    expect(nextGroupStatus("TENTATIVE")).toBe("DEFINITE");
    expect(nextGroupStatus("DEFINITE")).toBe("IN_HOUSE");
    expect(nextGroupStatus("IN_HOUSE")).toBe("CLOSED");
    expect(nextGroupStatus("CLOSED")).toBeNull();
  });

  it("applies the documented sequential transition", () => {
    expect(canTransitionGroup("INQUIRY", "TENTATIVE")).toBe(true);
    expect(canTransitionGroup("IN_HOUSE", "CLOSED")).toBe(true);
  });

  it("rejects invalid jumps, skips and backward moves", () => {
    expect(canTransitionGroup("INQUIRY", "DEFINITE")).toBe(false);
    expect(canTransitionGroup("INQUIRY", "IN_HOUSE")).toBe(false);
    expect(canTransitionGroup("TENTATIVE", "INQUIRY")).toBe(false);
    expect(canTransitionGroup("DEFINITE", "CLOSED")).toBe(false);
    expect(canTransitionGroup("CLOSED", "INQUIRY")).toBe(false);
  });

  it("recognizes only known lifecycle statuses", () => {
    expect(GROUP_LIFECYCLE.every((status) => isGroupLifecycleStatus(status))).toBe(true);
    expect(isGroupLifecycleStatus("CANCELLED")).toBe(false);
    expect(isGroupLifecycleStatus("inquiry")).toBe(false);
  });

  it("exposes no transitions from a closed group", () => {
    const closed: GroupLifecycleStatus = "CLOSED";
    expect(GROUP_LIFECYCLE.every((status) => canTransitionGroup(closed, status))).toBe(false);
  });
});
