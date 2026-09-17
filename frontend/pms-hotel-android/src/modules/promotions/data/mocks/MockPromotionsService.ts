import { type PromotionsFixtureDto } from '@/modules/promotions/data/dto/PromotionsFixtureDto';
import { promotionsFixture } from '@/modules/promotions/data/mocks/promotionsFixture';
import { type PromotionsService } from '@/modules/promotions/data/services/PromotionsService';

export class MockPromotionsService implements PromotionsService {
  public constructor(private readonly overrides: Partial<PromotionsService> = {}) {}

  public getPromotions(): Promise<PromotionsFixtureDto> {
    return this.overrides.getPromotions?.() ?? Promise.resolve(promotionsFixture);
  }
}
