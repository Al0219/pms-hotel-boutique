import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { object, list, text, flag, date, choice, unique } from "@/lib/validation";
import type { Security } from "../model/security";

export function mapSecurity(value: unknown): Security {
  const dto = object(value);
  const sessions = unique(list(dto.sessions).map(raw => {
    const item = object(raw);
    return { id: text(item.session_id), device: text(item.device), browser: text(item.browser),
      lastActive: date(item.last_active), current: flag(item.is_current), status: choice(item.status, ["active", "closed"]) };
  }));
  if (sessions.filter(session => session.current).length > 1) throw new DomainMappingError("MULTIPLE_CURRENT_SESSIONS");
  return { sessions, mfaEnabled: flag(dto.mfa_enabled) };
}

