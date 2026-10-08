export type MarketingSmsConsentFixture = 'CONSENTED' | 'REVOKED';

export interface GuestAccountFixtureDto {
  fixtureKey: string;
  displayName: string;
  emailText: string;
  phoneText: string;
  privacyText: string;
  marketingSmsConsent: MarketingSmsConsentFixture;
}

export interface GuestProfileFixtureDto {
  languageText: string;
  bedPreferenceText: string;
  roomPreferenceText: string;
  floorPreferenceText: string;
  avoidPreferenceText: string;
}

export interface AccountProfileFixtureDto { account: GuestAccountFixtureDto; profile: GuestProfileFixtureDto; }
export interface UpdateAccountProfileFixtureInput { profile: GuestProfileFixtureDto; marketingSmsConsent: MarketingSmsConsentFixture; }
export interface UpdateAccountProfileFixtureResult { account: GuestAccountFixtureDto; profile: GuestProfileFixtureDto; confirmationText: string; auditText: string; }
