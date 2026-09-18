/**
 * PROVISIONAL API CONTRACT for Promotions.
 */
export interface PromotionDTO {
  code: string;
  title: string;
  discount_percentage: number;
  description: string;
  is_eligible: boolean;
  conditions: string;
}
