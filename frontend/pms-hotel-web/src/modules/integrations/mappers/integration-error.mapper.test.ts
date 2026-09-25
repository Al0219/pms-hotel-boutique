import { describe, expect, it } from "vitest";

import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import { mapIntegrationError } from "./integration-error.mapper";

const BASE_DTO = {
  error_id: "ERR-001",
  property_id: "GT-HB-01",
  integration_id: "INT-002",
  integration_provider: "Expedia",
  kind: "reservation_import",
  message: "Reserva EXP-99120 rechazada por tarifa desactualizada.",
  status: "PENDING",
  attempts: 1,
  max_attempts: 3,
  retryable: true,
  last_attempt_at: "2026-09-18T12:05:00.000Z",
  history: [{ status: "PENDING", at: "2026-09-18T12:00:00.000Z", note: " Primer intento " }],
};

describe("mapIntegrationError", () => {
  it("maps a queued error with its history", () => {
    const error = mapIntegrationError({ ...BASE_DTO });

    expect(error).toMatchObject({
      id: "ERR-001",
      propertyId: "GT-HB-01",
      integrationId: "INT-002",
      status: "PENDING",
      attempts: 1,
      maxAttempts: 3,
      retryable: true,
    });
    expect(error.lastAttemptAt).toBeInstanceOf(Date);
    expect(error.history).toEqual([expect.objectContaining({ status: "PENDING", note: "Primer intento" })]);
  });

  it("rejects an unknown error status", () => {
    expect(() => mapIntegrationError({ ...BASE_DTO, status: "STUCK" })).toThrow(
      new DomainMappingError("INVALID_INTEGRATION_ERROR_STATUS"),
    );
  });

  it("rejects an invalid history date", () => {
    expect(() =>
      mapIntegrationError({ ...BASE_DTO, history: [{ status: "PENDING", at: "ayer", note: null }] }),
    ).toThrow(DomainMappingError);
  });
});
