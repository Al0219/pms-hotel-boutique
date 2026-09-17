export interface StayPreferences {
  bedType: string;
  roomVibe: string;
  floorPreference: string;
  privacyLevel: string;
  revocableConsent: boolean;
}

export interface GuestProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  preferredLanguage: string;
  preferences: StayPreferences;
}
