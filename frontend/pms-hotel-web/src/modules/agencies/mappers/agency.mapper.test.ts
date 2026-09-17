import { describe, expect, it } from "vitest";

import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import { mapAgency } from "./agency.mapper";

describe("mapAgency", () => {
  it("maps and normalizes provisional agency DTO references", () => {
    expect(mapAgency({
      agency_id: " AGY-001 ", property_id: " GT-HB-01 ", legal_name: " Viajes Quetzal ", status_code: " ACTIVE ",
      contract_reference: " CTR-001 ", commission_reference: " COM-001 ", voucher_reference: " VCH-001 ",
    })).toEqual({
      id: "AGY-001", propertyId: "GT-HB-01", legalName: "Viajes Quetzal", statusCode: "ACTIVE",
      contractReference: "CTR-001", commissionReference: "COM-001", voucherReference: "VCH-001",
    });
  });

  it("keeps missing optional references as null", () => {
    expect(mapAgency({
      agency_id: "AGY-001", property_id: "GT-HB-01", legal_name: "Viajes Quetzal", status_code: "ACTIVE",
      contract_reference: null, commission_reference: " ", voucher_reference: null,
    }).commissionReference).toBeNull();
  });

  it("rejects a missing required agency identifier", () => {
    expect(() => mapAgency({
      agency_id: " ", property_id: "GT-HB-01", legal_name: "Viajes Quetzal", status_code: "ACTIVE",
      contract_reference: null, commission_reference: null, voucher_reference: null,
    })).toThrow(new DomainMappingError("INVALID_AGENCY_ID"));
  });
});
