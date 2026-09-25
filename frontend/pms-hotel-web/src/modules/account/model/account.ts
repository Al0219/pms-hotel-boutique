export interface UpcomingStaySummary {
  reservationCode: string;
  roomsCount: number;
  datesLabel: string;
  summaryText: string;
}

export interface ProfileSummary {
  name: string;
  preferredLanguage: string;
  description: string;
}

export interface InvoicesSummary {
  availableDocumentsCount: number;
  description: string;
}

export interface RewardsSummary {
  tierName: string;
  currentNights: number;
  targetNights: number;
  nextTierName: string;
  activeBenefitsCount: number;
  description: string;
}

export interface MessagesSummary {
  unreadCount: number;
  description: string;
}

export interface PromotionsSummary {
  eligibleOffersCount: number;
  featuredOfferTitle: string;
  description: string;
}

export interface AccountSummary {
  accountId: string;
  profileId: string | null;
  guestName: string;
  email: string;
  accessMethod: string;
  isActive: boolean;
  linkedReservationsCount: number;
  upcomingStay: UpcomingStaySummary | null;
  profile: ProfileSummary;
  invoices: InvoicesSummary;
  rewards: RewardsSummary;
  messages: MessagesSummary;
  promotions: PromotionsSummary;
}

export interface StayHistoryItem {
  reservationCode: string;
  roomCategory: string;
  nightsCount: number;
  totalAmountFormatted: string;
  dateRangeLabel: string;
  guestName: string;
  stayId: string;
  status: "COMPLETADA" | "CANCELADA" | "NO_SHOW";
}
