export interface Promotion {
  code: string;
  title: string;
  discountPercentage: number;
  description: string;
  isEligible: boolean;
  conditions: string;
  validFrom: string | null;
  validUntil: string | null;
  statusLabel: string | null;
  eligibilityReason: string | null;
  combinable: boolean | null;
  combinationReason: string | null;
}
