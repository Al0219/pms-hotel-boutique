export interface PromotionDetail {
  key: string;
  label: string;
  valueText: string;
}

export interface Promotion {
  key: string;
  title: string;
  benefitText: string;
  details: PromotionDetail[];
}

export interface Promotions {
  applicableCountText: string;
  accountContextText: string;
  channelText: string;
  items: Promotion[];
}
