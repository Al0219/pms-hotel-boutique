export interface Promotion {
  code: string;
  title: string;
  discountPercentage: number;
  description: string;
  isEligible: boolean;
  conditions: string;
}
