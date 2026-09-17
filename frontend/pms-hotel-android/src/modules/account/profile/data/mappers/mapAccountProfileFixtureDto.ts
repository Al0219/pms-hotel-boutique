import { type AccountProfileFixtureDto, type GuestAccountFixtureDto, type GuestProfileFixtureDto, type MarketingSmsConsentFixture, type UpdateAccountProfileFixtureInput, type UpdateAccountProfileFixtureResult } from '@/modules/account/profile/data/dto/AccountProfileFixtureDto';
import { type AccountProfile, type AccountProfileUpdateInput, type AccountProfileUpdateResult, type GuestAccount, type GuestProfile, type MarketingSmsConsent } from '@/modules/account/profile/domain/AccountProfile';

function consent(value: MarketingSmsConsentFixture): MarketingSmsConsent { return value === 'CONSENTED' ? 'consented' : 'revoked'; }
function fixtureConsent(value: MarketingSmsConsent): MarketingSmsConsentFixture { return value === 'consented' ? 'CONSENTED' : 'REVOKED'; }
export function mapGuestAccountFixtureDto(dto: GuestAccountFixtureDto): GuestAccount { return { key: dto.fixtureKey, displayName: dto.displayName, emailText: dto.emailText, phoneText: dto.phoneText, privacyText: dto.privacyText, marketingSmsConsent: consent(dto.marketingSmsConsent) }; }
export function mapGuestProfileFixtureDto(dto: GuestProfileFixtureDto): GuestProfile { return { ...dto }; }
export function mapAccountProfileFixtureDto(dto: AccountProfileFixtureDto): AccountProfile { return { account: mapGuestAccountFixtureDto(dto.account), profile: mapGuestProfileFixtureDto(dto.profile) }; }
export function mapAccountProfileUpdateInput(input: AccountProfileUpdateInput): UpdateAccountProfileFixtureInput { return { profile: { ...input.profile }, marketingSmsConsent: fixtureConsent(input.marketingSmsConsent) }; }
export function mapAccountProfileUpdateFixtureResult(dto: UpdateAccountProfileFixtureResult): AccountProfileUpdateResult { return { ...mapAccountProfileFixtureDto(dto), confirmationText: dto.confirmationText, auditText: dto.auditText }; }
