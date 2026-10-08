import { type AccountProfileFixtureDto } from '@/modules/account/profile/data/dto/AccountProfileFixtureDto';

export const accountProfileFixture: AccountProfileFixtureDto = {
  account: { fixtureKey: 'guest-account-primary', displayName: 'Sofía Morales', emailText: 'sofia.morales@correo.example', phoneText: '+502 5555 0184', privacyText: 'Solo cuenta', marketingSmsConsent: 'CONSENTED' },
  profile: { languageText: 'Español', bedPreferenceText: 'King', roomPreferenceText: 'Tranquila', floorPreferenceText: 'Alto', avoidPreferenceText: 'Zonas ruidosas' },
};
