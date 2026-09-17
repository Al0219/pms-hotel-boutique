import { type RewardsFixtureDto } from '@/modules/rewards/data/dto/RewardsFixtureDto';
import { type Rewards } from '@/modules/rewards/domain/Rewards';

function requiredText(value: string, field: string): string {
  if (!value.trim()) {
    throw new Error(`${field} must not be blank`);
  }

  return value;
}

export function mapRewardsFixtureDto(dto: RewardsFixtureDto): Rewards {
  return {
    currentLevelText: requiredText(dto.currentLevelText, 'currentLevelText'),
    progressText: requiredText(dto.progressText, 'progressText'),
    activeBenefitsText: requiredText(dto.activeBenefitsText, 'activeBenefitsText'),
    metrics: dto.metrics.map((metric) => ({
      key: requiredText(metric.fixtureKey, 'fixtureKey'),
      label: requiredText(metric.label, 'label'),
      valueText: requiredText(metric.valueText, 'valueText'),
    })),
  };
}
