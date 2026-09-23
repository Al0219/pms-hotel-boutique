export interface RewardBenefit {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
}

export interface RewardsProgram {
  accountId: string;
  currentTier: string;
  currentNights: number;
  targetNights: number;
  nextTier: string;
  benefits: RewardBenefit[];
}
