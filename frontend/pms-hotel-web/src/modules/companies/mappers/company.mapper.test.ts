import { describe, expect, it } from "vitest";

import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import { mapCompany } from "./company.mapper";

describe("mapCompany", () => {
  it("maps and normalizes provisional company DTO references", () => {
    expect(mapCompany({
      company_id: " CMP-001 ", property_id: " GT-HB-01 ", legal_name: " Corporativo Maya ", status_code: " ACTIVE ",
      agreement_reference: " AGR-001 ", credit_reference: " CRT-001 ", direct_bill_requested: true,
    })).toEqual({
      id: "CMP-001", propertyId: "GT-HB-01", legalName: "Corporativo Maya", status: "ACTIVE",
      agreementReference: "AGR-001", creditReference: "CRT-001", directBillRequested: true,
    });
  });

  it("keeps missing optional references as null", () => {
    expect(mapCompany({
      company_id: "CMP-001", property_id: "GT-HB-01", legal_name: "Corporativo Maya", status_code: "ACTIVE",
      agreement_reference: null, credit_reference: " ", direct_bill_requested: false,
    }).creditReference).toBeNull();
  });

  it("never presents a direct bill as approved", () => {
    expect(mapCompany({
      company_id: "CMP-001", property_id: "GT-HB-01", legal_name: "Corporativo Maya", status_code: "ACTIVE",
      agreement_reference: null, credit_reference: null, direct_bill_requested: true,
    }).directBillRequested).toBe(true);
  });

  it("rejects an unknown company status", () => {
    expect(() => mapCompany({
      company_id: "CMP-001", property_id: "GT-HB-01", legal_name: "Corporativo Maya", status_code: "PENDING",
      agreement_reference: null, credit_reference: null, direct_bill_requested: false,
    })).toThrow(new DomainMappingError("INVALID_COMPANY_STATUS"));
  });

  it("rejects a missing required company identifier", () => {
    expect(() => mapCompany({
      company_id: " ", property_id: "GT-HB-01", legal_name: "Corporativo Maya", status_code: "ACTIVE",
      agreement_reference: null, credit_reference: null, direct_bill_requested: false,
    })).toThrow(new DomainMappingError("INVALID_COMPANY_ID"));
  });
});
