import { describe, expect, it } from "vitest";

import { summarizeIntegrations, type Integration } from "./integration";

const BASE: Integration = {
  id: "INT-001",
  propertyId: "GT-HB-01",
  category: "Channels",
  provider: "Booking.com",
  adapter: "channel-booking",
  health: "HEALTHY",
  lastSync: "08 sep 2026 · 14:08",
  capabilities: ["Reservations"],
};

describe("summarizeIntegrations", () => {
  it("keeps counts coherent with health states", () => {
    expect(
      summarizeIntegrations([
        BASE,
        { ...BASE, id: "INT-002", category: "Payments", health: "HEALTHY" },
        { ...BASE, id: "INT-003", category: "POS", health: "ATTENTION" },
        { ...BASE, id: "INT-004", category: "Locks", health: "DEGRADED" },
        { ...BASE, id: "INT-005", category: "Fiscal", health: "CONFIGURED" },
      ]),
    ).toEqual({ categories: 5, healthy: 2, needsReview: 2, configured: 1 });
  });
});
