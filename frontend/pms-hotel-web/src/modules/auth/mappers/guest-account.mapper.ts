import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import type { ExternalIdentityDTO, GuestAccountDTO } from "../dtos/guest-account.dto";
import type { ExternalIdentity, GuestAccount } from "../model/guest-account";

function requiredText(value: unknown, code: string): string {
  if (typeof value !== "string") throw new DomainMappingError(code);
  const normalized = value.trim();
  if (!normalized) throw new DomainMappingError(code);
  return normalized;
}

function mapExternalIdentity(dto: ExternalIdentityDTO): ExternalIdentity {
  if (!dto || dto.provider !== "GOOGLE") throw new DomainMappingError("INVALID_EXTERNAL_IDENTITY_PROVIDER");
  const connectedAt = new Date(dto.connected_at);
  if (Number.isNaN(connectedAt.getTime())) throw new DomainMappingError("INVALID_EXTERNAL_IDENTITY_CONNECTED_AT");

  return { provider: dto.provider, subject: requiredText(dto.external_subject, "INVALID_EXTERNAL_IDENTITY_SUBJECT"), connectedAt };
}

export function mapGuestAccount(dto: GuestAccountDTO): GuestAccount {
  if (!dto || !Array.isArray(dto.external_identities)) throw new DomainMappingError("INVALID_GUEST_ACCOUNT");
  if (dto.email !== null && typeof dto.email !== "string") throw new DomainMappingError("INVALID_GUEST_ACCOUNT_EMAIL");
  return {
    id: requiredText(dto.account_id, "INVALID_GUEST_ACCOUNT_ID"),
    email: dto.email?.trim() || null,
    externalIdentities: dto.external_identities.map(mapExternalIdentity),
  };
}
