import { describe, expect, it } from "vitest";

import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import {
  mapCleaningTransitionResult,
  mapDiscrepancyResolution,
} from "./room-cleaning-transition.mapper";

describe("mapCleaningTransitionResult", () => {
  it("maps a valid transition result", () => {
    expect(
      mapCleaningTransitionResult({ room_id: "ROOM-101", property_id: "GT-HB-01", cleaning_status: " CLEAN " }),
    ).toEqual({ roomId: "ROOM-101", propertyId: "GT-HB-01", status: "CLEAN" });
  });

  it("rejects an unknown cleaning status", () => {
    expect(() =>
      mapCleaningTransitionResult({ room_id: "ROOM-101", property_id: "GT-HB-01", cleaning_status: "POLISHED" }),
    ).toThrow(DomainMappingError);
  });

  it("rejects a missing room identifier", () => {
    expect(() =>
      mapCleaningTransitionResult({ room_id: "  ", property_id: "GT-HB-01", cleaning_status: "CLEAN" }),
    ).toThrow(DomainMappingError);
  });
});

describe("mapDiscrepancyResolution", () => {
  it("maps a valid resolution with a parsed date", () => {
    const resolution = mapDiscrepancyResolution({
      room_id: "ROOM-101",
      reason: " Limpieza verificada con FO ",
      resolved_at: "2026-09-20T10:30:00.000Z",
    });

    expect(resolution.roomId).toBe("ROOM-101");
    expect(resolution.reason).toBe("Limpieza verificada con FO");
    expect(resolution.resolvedAt).toBeInstanceOf(Date);
  });

  it("rejects an empty reason", () => {
    expect(() =>
      mapDiscrepancyResolution({ room_id: "ROOM-101", reason: "   ", resolved_at: "2026-09-20T10:30:00.000Z" }),
    ).toThrow(DomainMappingError);
  });

  it("rejects an invalid resolution date", () => {
    expect(() =>
      mapDiscrepancyResolution({ room_id: "ROOM-101", reason: "Verificada", resolved_at: "ayer" }),
    ).toThrow(DomainMappingError);
  });
});
