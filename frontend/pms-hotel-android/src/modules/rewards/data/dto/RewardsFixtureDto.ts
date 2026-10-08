export interface RewardMetricFixtureDto {
  fixtureKey: string;
  label: string;
  valueText: string;
}

export interface RewardsFixtureDto {
  currentLevelText: string;
  progressText: string;
  activeBenefitsText: string;
  metrics: RewardMetricFixtureDto[];
}
