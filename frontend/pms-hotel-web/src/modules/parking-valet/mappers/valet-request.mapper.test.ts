import { describe, expect, it } from "vitest";

import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import { mapValetRequest } from "./valet-request.mapper";

const DTO = {
  request_id: " VR-001 ",
  property_id: " GT-HB-01 ",
  guest_name: " María García ",
  vehicle_description: " ABC-123 Toyota Corolla ",
  request_type: " VALET_IN ",
  status: " PENDING ",
  parking_space: " P-12 ",
  notes: " Llega en 30 minutos ",
};

describe("mapValetRequest", () => {
  it("maps and normalizes a provisional valet request", () => {
    expect(mapValetRequest(DTO)).toEqual({
      id: "VR-001",
      propertyId: "GT-HB-01",
      guestName: "María García",
      vehicleDescription: "ABC-123 Toyota Corolla",
      requestType: "VALET_IN",
      status: "PENDING",
      parkingSpace: "P-12",
      notes: "Llega en 30 minutos",
    });
  });

  it("keeps a missing parking space as null", () => {
    expect(mapValetRequest({ ...DTO, parking_space: " " }).parkingSpace).toBeNull();
  });

  it("keeps missing notes as null", () => {
    expect(mapValetRequest({ ...DTO, notes: " " }).notes).toBeNull();
  });

  it("rejects an unknown request status", () => {
    expect(() => mapValetRequest({ ...DTO, status: "CANCELLED" })).toThrow(
      new DomainMappingError("INVALID_VALET_REQUEST_STATUS"),
    );
  });

  it("rejects an unknown request type", () => {
    expect(() => mapValetRequest({ ...DTO, request_type: "WASH" })).toThrow(
      new DomainMappingError("INVALID_VALET_REQUEST_TYPE"),
    );
  });

  it("rejects a missing required request identifier", () => {
    expect(() => mapValetRequest({ ...DTO, request_id: " " })).toThrow(
      new DomainMappingError("INVALID_VALET_REQUEST_ID"),
    );
  });

  it("rejects a missing guest name", () => {
    expect(() => mapValetRequest({ ...DTO, guest_name: " " })).toThrow(
      new DomainMappingError("INVALID_VALET_REQUEST_GUEST_NAME"),
    );
  });
});
