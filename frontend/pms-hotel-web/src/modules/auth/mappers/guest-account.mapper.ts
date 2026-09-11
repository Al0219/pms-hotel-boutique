import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import type { ExternalIdentityDTO, GuestAccountDTO } from "../dtos/guest-account.dto";
import type { ExternalIdentity, GuestAccount } from "../model/guest-account";

function requiredText(value: string, code: string): string {
  const normalized = value.trim();
  if (!normalized) throw new DomainMappingError(code);
  return normalized;
}

function mapExternalIdentity(dto: ExternalIdentityDTO): ExternalIdentity {
  const connectedAt = new Date(dto.connected_at);
  if (Number.isNaN(connectedAt.getTime())) throw new DomainMappingError("INVALID_EXTERNAL_IDENTITY_CONNECTED_AT");

  return { provider: dto.provider, subject: requiredText(dto.external_subject, "INVALID_EXTERNAL_IDENTITY_SUBJECT"), connectedAt };
}

export function mapGuestAccount(dto: GuestAccountDTO): GuestAccount {
  return {
    id: requiredText(dto.account_id, "INVALID_GUEST_ACCOUNT_ID"),
    email: dto.email?.trim() || null,
    externalIdentities: dto.external_identities.map(mapExternalIdentity),
  };
}
