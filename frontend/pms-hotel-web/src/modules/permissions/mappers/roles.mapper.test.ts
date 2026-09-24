import { describe, expect, it } from "vitest";
import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { initialRoles } from "@/data/mocks/private-07";
import { mapRoles, toRolesDTO } from "./roles.mapper";

describe("roles mock mapper", () => {
  it("preserves an unconfigured role without inventing grants and roundtrips", () => {
    const dto = initialRoles(), roles = mapRoles(dto);
    expect(roles[0]).toMatchObject({ permissions: [], properties: [], description: null, configured: false });
    expect(toRolesDTO(roles)).toEqual(dto);
  });
  it.each(["permission_ids", "property_ids", "user_count", "configured"])("rejects invalid %s", field => {
    const dto = initialRoles();
    Object.assign(dto.roles[0], { [field]: field.endsWith("_ids") ? ["UNKNOWN"] : "invalid" });
    expect(() => mapRoles(dto)).toThrow(DomainMappingError);
  });
  it("rejects duplicate names and invalid required fields", () => {
    const dto = initialRoles(); dto.roles[0].name = dto.roles[1].name;
    expect(() => mapRoles(dto)).toThrow(DomainMappingError);
    expect(() => mapRoles({ roles: [null] })).toThrow(DomainMappingError);
  });
});

