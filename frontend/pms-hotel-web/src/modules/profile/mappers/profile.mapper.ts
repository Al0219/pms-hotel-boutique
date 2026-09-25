import { boolean, text } from "@/lib/validation";
import type { GuestProfileDTO } from "../dtos/profile.dto";
import type { GuestProfile } from "../model/profile";

export function mapGuestProfile(dto: GuestProfileDTO): GuestProfile {
  return { id: text(dto.profile_id), firstName: text(dto.first_name), lastName: text(dto.last_name), email: text(dto.email), phone: text(dto.phone),
    country: text(dto.country), preferredLanguage: text(dto.preferred_language), preferences: {
      bedType: text(dto.preferences?.bed_type), roomVibe: text(dto.preferences?.room_vibe), floorPreference: text(dto.preferences?.floor_preference),
      privacyLevel: text(dto.preferences?.privacy_level), revocableConsent: boolean(dto.preferences?.revocable_consent),
    } };
}
/** Explicit outbound mapping: no GuestAccount/auth fields are sent. */
export function toGuestProfileDTO(profile: GuestProfile): GuestProfileDTO {
  return { profile_id: profile.id, first_name: profile.firstName.trim(), last_name: profile.lastName.trim(), email: profile.email.trim(), phone: profile.phone.trim(),
    country: profile.country.trim(), preferred_language: profile.preferredLanguage, preferences: { bed_type: profile.preferences.bedType, room_vibe: profile.preferences.roomVibe,
      floor_preference: profile.preferences.floorPreference, privacy_level: profile.preferences.privacyLevel, revocable_consent: profile.preferences.revocableConsent } };
}
