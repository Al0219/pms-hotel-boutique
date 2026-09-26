import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { choice, list, object, text } from "@/lib/validation";
import type { StaffIdentity } from "../model/staff-session";

export function mapStaffIdentity(raw: unknown): StaffIdentity {
  const dto = object(raw);
  const memberships = list(dto.memberships).map(value => {
    const item = object(value);
    const timezone = text(item.timezone);
    const currency = text(item.currency);
    try { new Intl.DateTimeFormat("es", { timeZone: timezone }); }
    catch { throw new DomainMappingError("INVALID_TIMEZONE"); }
    if (!/^[A-Z]{3}$/.test(currency)) throw new DomainMappingError("INVALID_CURRENCY");
    return {
      propertyId: text(item.property_id), name: text(item.name), timezone, currency,
      active: choice(item.status, ["ACTIVE", "INACTIVE"]) === "ACTIVE",
    };
  });
  if (new Set(memberships.map(item => item.propertyId)).size !== memberships.length) {
    throw new DomainMappingError("DUPLICATE_MEMBERSHIP");
  }
  return { id: text(dto.session_id), userName: text(dto.user_name), roleId: text(dto.role_id), memberships };
}
