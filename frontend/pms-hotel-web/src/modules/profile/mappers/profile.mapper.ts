import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import type { GuestProfileDTO } from "../dtos/profile.dto";
import type { GuestProfile } from "../model/profile";

function requiredText(value: string | undefined | null, code: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new DomainMappingError(code);
  return normalized;
}

export function mapGuestProfile(dto: GuestProfileDTO): GuestProfile {
  return {
    id: requiredText(dto.profile_id, "INVALID_PROFILE_ID"),
    firstName: requiredText(dto.first_name, "INVALID_FIRST_NAME"),
    lastName: requiredText(dto.last_name, "INVALID_LAST_NAME"),
    email: requiredText(dto.email, "INVALID_EMAIL"),
    phone: requiredText(dto.phone, "INVALID_PHONE"),
    country: dto.country?.trim() || "Guatemala",
    preferredLanguage: dto.preferred_language?.trim() || "Español",
    preferences: {
      bedType: dto.preferences?.bed_type || "King",
      roomVibe: dto.preferences?.room_vibe || "tranquila",
      floorPreference: dto.preferences?.floor_preference || "Piso alto · evitar zonas ruidosas",
      privacyLevel: dto.preferences?.privacy_level || "SOLO CUENTA",
      revocableConsent: Boolean(dto.preferences?.revocable_consent ?? true),
    },
  };
}
