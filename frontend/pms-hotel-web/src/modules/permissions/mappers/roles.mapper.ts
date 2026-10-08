import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { object, list, text, flag, choice, unique } from "@/lib/validation";
import { permissionIds, exampleProperties } from "../model/catalog";
import type { RolePreview } from "../model/role";
import type { RolesDTO } from "../dtos/roles.dto";

export function mapRoles(value: unknown): RolePreview[] {
  const roles = unique(list(object(value).roles).map(raw => {
    const dto = object(raw);
    if (typeof dto.user_count !== "number" || !Number.isInteger(dto.user_count) || dto.user_count < 0) throw new DomainMappingError("INVALID_USER_COUNT");
    const name = text(dto.name);
    if (name.length > 60) throw new DomainMappingError("INVALID_ROLE_NAME");
    return { id: text(dto.role_id), name, users: dto.user_count,
      description: dto.description === null ? null : text(dto.description),
      properties: list(dto.property_ids).map(id => choice(id, exampleProperties)),
      permissions: list(dto.permission_ids).map(id => choice(id, permissionIds)), configured: flag(dto.configured) };
  }));
  if (new Set(roles.map(role => role.name.toLocaleLowerCase("es"))).size !== roles.length) throw new DomainMappingError("DUPLICATE_ROLE_NAME");
  return roles;
}
export function toRolesDTO(roles: readonly RolePreview[]): RolesDTO {
  return { roles: roles.map(role => ({
    role_id: role.id, name: role.name, user_count: role.users, description: role.description,
    property_ids: role.properties, permission_ids: role.permissions, configured: role.configured,
  })) };
}

