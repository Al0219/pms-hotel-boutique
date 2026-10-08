import { type PromotionsFixtureDto } from '@/modules/promotions/data/dto/PromotionsFixtureDto';

export const promotionsFixture: PromotionsFixtureDto = {
  applicableCountText: '1',
  accountContextText: 'Cuenta Silver',
  channelText: 'DIRECT_APP',
  items: [
    {
      fixtureKey: 'member-rate',
      title: 'Member Rate',
      benefitText: '−5%',
      details: [
        { fixtureKey: 'eligibility', label: 'Elegibilidad', valueText: 'Cuenta Silver' },
        { fixtureKey: 'channel', label: 'Canal', valueText: 'DIRECT_APP' },
        { fixtureKey: 'combination', label: 'Combinación', valueText: 'Exclusiva' },
        { fixtureKey: 'validity', label: 'Vigencia', valueText: 'Rate Plan vigente' },
        { fixtureKey: 'availability', label: 'Disponibilidad', valueText: 'Requerida' },
      ],
    },
  ],
};
