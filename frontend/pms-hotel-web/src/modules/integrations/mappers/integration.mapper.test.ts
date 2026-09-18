import { describe, expect, it } from "vitest";

import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import { mapIntegration } from "./integration.mapper";

const DTO = {
  integration_id: " INT-001 ",
  property_id: " GT-HB-01 ",
  category: " Channels ",
  provider: " Booking.com ",
  adapter: " channel-booking ",
  health: " HEALTHY ",
  last_sync: " 08 sep 2026 · 14:08 ",
  capabilities: [" Reservations ", " ", "Rates"],
};

describe("mapIntegration", () => {
  it("maps and normalizes a provisional integration DTO without secrets", () => {
    expect(mapIntegration(DTO)).toEqual({
      id: "INT-001",
      propertyId: "GT-HB-01",
      category: "Channels",
      provider: "Booking.com",
      adapter: "channel-booking",
      health: "HEALTHY",
      lastSync: "08 sep 2026 · 14:08",
      capabilities: ["Reservations", "Rates"],
    });
  });

  it("keeps missing optional references as null", () => {
    expect(mapIntegration({
      ...DTO,
      adapter: " ",
      last_sync: null,
      capabilities: [],
    })).toEqual(expect.objectContaining({ adapter: null, lastSync: null, capabilities: [] }));
  });

  it("rejects an unknown category instead of presenting an invalid connector", () => {
    expect(() => mapIntegration({ ...DTO, category: "Loyalty" })).toThrow(
      new DomainMappingError("INVALID_INTEGRATION_CATEGORY"),
    );
  });

  it("rejects an unknown health state", () => {
    expect(() => mapIntegration({ ...DTO, health: "UNKNOWN" })).toThrow(
      new DomainMappingError("INVALID_INTEGRATION_HEALTH"),
    );
  });

  it("rejects a missing required integration identifier", () => {
    expect(() => mapIntegration({ ...DTO, integration_id: " " })).toThrow(
      new DomainMappingError("INVALID_INTEGRATION_ID"),
    );
  });
});
