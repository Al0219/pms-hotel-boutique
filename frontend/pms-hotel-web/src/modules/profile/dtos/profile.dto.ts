/**
 * PROVISIONAL API CONTRACT for GuestProfile.
 * Replace or confirm with Backend before this contract is marked CONFIRMED.
 */
export interface StayPreferencesDTO {
  bed_type: string;
  room_vibe: string;
  floor_preference: string;
  privacy_level: string;
  revocable_consent: boolean;
}

export interface GuestProfileDTO {
  profile_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country: string;
  preferred_language: string;
  preferences: StayPreferencesDTO;
}
