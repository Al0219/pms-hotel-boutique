export interface RewardMetric {
  key: string;
  label: string;
  valueText: string;
}

export interface Rewards {
  currentLevelText: string;
  progressText: string;
  activeBenefitsText: string;
  metrics: RewardMetric[];
}
