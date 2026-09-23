import { type PromotionsFixtureDto } from '@/modules/promotions/data/dto/PromotionsFixtureDto';

export interface PromotionsService {
  getPromotions(): Promise<PromotionsFixtureDto>;
}
