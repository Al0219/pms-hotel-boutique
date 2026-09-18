/**
 * PROVISIONAL API CONTRACT for Rewards.
 */
export interface RewardBenefitDTO {
  id: string;
  title: string;
  description: string;
  is_active: boolean;
}

export interface RewardsProgramDTO {
  account_id: string;
  current_tier: string;
  current_nights: number;
  target_nights: number;
  next_tier: string;
  benefits: RewardBenefitDTO[];
}
