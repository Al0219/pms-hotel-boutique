import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import type { GuestSessionDTO } from "../dtos/guest-session.dto";
import type { GuestSession } from "../model/guest-session";

function requiredText(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new DomainMappingError("INVALID_GUEST_SESSION");
  return value.trim();
}

export function mapGuestSession(dto: GuestSessionDTO): GuestSession {
  if (!dto || dto.context !== "GUEST") throw new DomainMappingError("INVALID_GUEST_SESSION_CONTEXT");
  // Select known fields explicitly; never copy extra credential/identity fields.
  return {
    id: requiredText(dto.sessionId),
    context: "GUEST",
    account: { id: requiredText(dto.guestAccountId), email: requiredText(dto.email) },
  };
}
