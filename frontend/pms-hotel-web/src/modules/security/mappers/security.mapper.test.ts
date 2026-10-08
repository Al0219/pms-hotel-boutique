import { describe, expect, it } from "vitest";
import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { initialSecurity } from "@/data/mocks/private-07";
import { mapSecurity } from "./security.mapper";

describe("security mock mapper", () => {
  it("exposes safe metadata and converts dates", () => {
    const data = mapSecurity({ ...initialSecurity(), token: "must-not-reach-ui" });
    expect(data.sessions[0].lastActive).toBeInstanceOf(Date);
    expect(data).not.toHaveProperty("token");
  });
  it.each(["last_active", "status", "is_current", "device"])("rejects invalid %s", field => {
    const dto = initialSecurity(); Object.assign(dto.sessions[0], { [field]: "invalid" });
    if (field === "device") dto.sessions[0].device = "";
    expect(() => mapSecurity(dto)).toThrow(DomainMappingError);
  });
  it("rejects multiple current sessions and malformed MFA status", () => {
    const dto = initialSecurity(); dto.sessions[1].is_current = true;
    expect(() => mapSecurity(dto)).toThrow(DomainMappingError);
    expect(() => mapSecurity({ sessions: [], mfa_enabled: "yes" })).toThrow(DomainMappingError);
  });
});

