export type MarketingSmsConsent = 'consented' | 'revoked';

export interface GuestAccount {
  key: string;
  displayName: string;
  emailText: string;
  phoneText: string;
  privacyText: string;
  marketingSmsConsent: MarketingSmsConsent;
}

export interface GuestProfile {
  languageText: string;
  bedPreferenceText: string;
  roomPreferenceText: string;
  floorPreferenceText: string;
  avoidPreferenceText: string;
}

export interface AccountProfile { account: GuestAccount; profile: GuestProfile; }
export interface AccountProfileUpdateInput { profile: GuestProfile; marketingSmsConsent: MarketingSmsConsent; }
export interface AccountProfileUpdateResult extends AccountProfile { confirmationText: string; auditText: string; }
