/**
 * PROVISIONAL API CONTRACT for Account Summary.
 * Replace or confirm with Backend before this contract is marked CONFIRMED.
 */
export interface AccountSummaryDTO {
  account_id: string;
  profile_id?: string;
  guest_name: string;
  email: string;
  access_method: string;
  is_active: boolean;
  linked_reservations_count: number;
  upcoming_stay: {
    reservation_code: string;
    rooms_count: number;
    dates_label: string;
    summary_text: string;
  } | null;
  profile_summary: {
    name: string;
    preferred_language: string;
    description: string;
  };
  invoices_summary: {
    available_documents_count: number;
    description: string;
  };
  rewards_summary: {
    tier_name: string;
    current_nights: number;
    target_nights: number;
    next_tier_name: string;
    active_benefits_count: number;
    description: string;
  };
  messages_summary: {
    unread_count: number;
    description: string;
  };
  promotions_summary: {
    eligible_offers_count: number;
    featured_offer_title: string;
    description: string;
  };
}

export interface StayHistoryItemDTO {
  reservation_code: string;
  room_category: string;
  nights_count: number;
  total_amount_formatted: string;
  date_range_label: string;
  guest_name: string;
  stay_id: string;
  status: "COMPLETADA" | "CANCELADA" | "NO_SHOW";
}
