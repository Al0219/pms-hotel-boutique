export interface PromotionDetailFixtureDto {
  fixtureKey: string;
  label: string;
  valueText: string;
}

export interface PromotionFixtureDto {
  fixtureKey: string;
  title: string;
  benefitText: string;
  details: PromotionDetailFixtureDto[];
}

export interface PromotionsFixtureDto {
  applicableCountText: string;
  accountContextText: string;
  channelText: string;
  items: PromotionFixtureDto[];
}
