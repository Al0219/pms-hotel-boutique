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
  valid_from?: string | null;
  valid_until?: string | null;
  status_label?: string;
  eligibility_reason?: string | null;
  combinable?: boolean | null;
  combination_reason?: string | null;
}
