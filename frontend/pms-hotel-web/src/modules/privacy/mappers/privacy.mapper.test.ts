import { describe, expect, it } from "vitest";
import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { initialPrivacy } from "@/data/mocks/private-07";
import { mapPrivacy } from "./privacy.mapper";

describe("privacy mock mapper", () => {
  it("maps dates and keeps consent channels independent", () => {
    const dto = initialPrivacy(); dto.consents[1].active = false;
    const data = mapPrivacy(dto);
    expect(data.consents[0].active).toBe(true);
    expect(data.consents[1].active).toBe(false);
    expect(data.consents[0].updatedAt).toBeInstanceOf(Date);
  });
  it.each(["purpose", "channel", "active", "updated_at", "evidence_version"])("rejects invalid %s", field => {
    const dto = initialPrivacy(); Object.assign(dto.consents[0], { [field]: null });
    expect(() => mapPrivacy(dto)).toThrow(DomainMappingError);
  });
  it("rejects unknown DSR states", () => {
    expect(() => mapPrivacy({ consents: [], requests: [{ request_id: "r", kind: "export", status: "deleted", created_at: "2026-09-24" }] })).toThrow(DomainMappingError);
  });
});

