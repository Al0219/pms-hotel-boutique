import { describe, expect, it } from "vitest";

import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import { mapOperationalMessage } from "./operational-message.mapper";

const DTO = {
  message_id: " MSG-001 ",
  property_id: " GT-HB-01 ",
  subject: " Servicio de habitación pendiente ",
  body: " Habitación 302 solicita amenities adicionales. ",
  sender_role: " OPERATIONS ",
  status: " PENDING ",
  related_reservation_id: " RES-042 ",
  created_at: " 2026-09-18T10:30:00Z ",
};

describe("mapOperationalMessage", () => {
  it("maps and normalizes a provisional operational message", () => {
    const result = mapOperationalMessage(DTO);

    expect(result).toEqual({
      id: "MSG-001",
      propertyId: "GT-HB-01",
      subject: "Servicio de habitación pendiente",
      body: "Habitación 302 solicita amenities adicionales.",
      senderRole: "OPERATIONS",
      status: "PENDING",
      relatedReservationId: "RES-042",
      createdAt: new Date("2026-09-18T10:30:00Z"),
    });
  });

  it("keeps a missing reservation reference as null", () => {
    expect(mapOperationalMessage({ ...DTO, related_reservation_id: " " }).relatedReservationId).toBeNull();
  });

  it("rejects an unknown message status", () => {
    expect(() => mapOperationalMessage({ ...DTO, status: "SENT_TO_GUEST" })).toThrow(
      new DomainMappingError("INVALID_OPERATIONAL_MESSAGE_STATUS"),
    );
  });

  it("rejects an unknown sender role", () => {
    expect(() => mapOperationalMessage({ ...DTO, sender_role: "GUEST" })).toThrow(
      new DomainMappingError("INVALID_OPERATIONAL_MESSAGE_SENDER_ROLE"),
    );
  });

  it("rejects a missing required message identifier", () => {
    expect(() => mapOperationalMessage({ ...DTO, message_id: " " })).toThrow(
      new DomainMappingError("INVALID_OPERATIONAL_MESSAGE_ID"),
    );
  });

  it("rejects a missing subject", () => {
    expect(() => mapOperationalMessage({ ...DTO, subject: " " })).toThrow(
      new DomainMappingError("INVALID_OPERATIONAL_MESSAGE_SUBJECT"),
    );
  });

  it("rejects a missing body", () => {
    expect(() => mapOperationalMessage({ ...DTO, body: " " })).toThrow(
      new DomainMappingError("INVALID_OPERATIONAL_MESSAGE_BODY"),
    );
  });

  it("rejects an invalid created_at datetime", () => {
    expect(() => mapOperationalMessage({ ...DTO, created_at: "not-a-date" })).toThrow(
      new DomainMappingError("INVALID_OPERATIONAL_MESSAGE_CREATED_AT"),
    );
  });
});
