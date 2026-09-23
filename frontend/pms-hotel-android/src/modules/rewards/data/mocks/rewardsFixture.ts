import { type RewardsFixtureDto } from '@/modules/rewards/data/dto/RewardsFixtureDto';

export const rewardsFixture: RewardsFixtureDto = {
  currentLevelText: 'Silver',
  progressText: '3 / 8 hacia Gold',
  activeBenefitsText: '3 beneficios activos',
  metrics: [
    { fixtureKey: 'member-rate', label: '5% Member Rate', valueText: 'Activo' },
    { fixtureKey: 'credit', label: 'Crédito', valueText: 'Q 150' },
    { fixtureKey: 'late-checkout', label: 'Late checkout', valueText: '14:00' },
    { fixtureKey: 'next-level', label: 'Próximo nivel', valueText: 'Gold' },
    { fixtureKey: 'remaining-stays', label: 'Faltan', valueText: '5 estadías' },
    { fixtureKey: 'eligible-nights', label: 'Noches elegibles', valueText: '5' },
  ],
};
