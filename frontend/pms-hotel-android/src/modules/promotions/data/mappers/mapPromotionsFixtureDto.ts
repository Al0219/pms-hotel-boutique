import { type PromotionsFixtureDto } from '@/modules/promotions/data/dto/PromotionsFixtureDto';
import { type Promotions } from '@/modules/promotions/domain/Promotions';

function requiredText(value: string, field: string): string {
  if (!value.trim()) {
    throw new Error(`${field} must not be blank`);
  }

  return value;
}

export function mapPromotionsFixtureDto(dto: PromotionsFixtureDto): Promotions {
  return {
    applicableCountText: requiredText(dto.applicableCountText, 'applicableCountText'),
    accountContextText: requiredText(dto.accountContextText, 'accountContextText'),
    channelText: requiredText(dto.channelText, 'channelText'),
    items: dto.items.map((item) => ({
      key: requiredText(item.fixtureKey, 'fixtureKey'),
      title: requiredText(item.title, 'title'),
      benefitText: requiredText(item.benefitText, 'benefitText'),
      details: item.details.map((detail) => ({
        key: requiredText(detail.fixtureKey, 'fixtureKey'),
        label: requiredText(detail.label, 'label'),
        valueText: requiredText(detail.valueText, 'valueText'),
      })),
    })),
  };
}
