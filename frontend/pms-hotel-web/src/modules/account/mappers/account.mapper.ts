import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import type { AccountSummaryDTO, MockAccountSummaryDTO, StayHistoryItemDTO } from "../dtos/account.dto";
import type { RealAccountSummary, MockAccountSummary, StayHistoryItem } from "../model/account";

function requiredText(value: string | undefined | null, code: string): string {
  const normalized = typeof value === "string" ? value.trim() : undefined;
  if (!normalized) throw new DomainMappingError(code);
  return normalized;
}

export function mapMockAccountSummary(dto: MockAccountSummaryDTO): MockAccountSummary {
  return {
    source: "mock",
    accountId: requiredText(dto.account_id, "INVALID_ACCOUNT_ID"),
    profileId: dto.profile_id == null ? null : requiredText(dto.profile_id, "INVALID_PROFILE_ID"),
    guestName: requiredText(dto.guest_name, "INVALID_GUEST_NAME"),
    email: requiredText(dto.email, "INVALID_GUEST_EMAIL"),
    accessMethod: dto.access_method || "Enlace de un solo uso",
    isActive: Boolean(dto.is_active),
    linkedReservationsCount: Math.max(0, dto.linked_reservations_count ?? 0),
    upcomingStay: dto.upcoming_stay
      ? {
          reservationCode: requiredText(dto.upcoming_stay.reservation_code, "INVALID_RESERVATION_CODE"),
          roomsCount: dto.upcoming_stay.rooms_count,
          datesLabel: dto.upcoming_stay.dates_label,
          summaryText: dto.upcoming_stay.summary_text,
        }
      : null,
    profile: {
      name: requiredText(dto.profile_summary?.name, "INVALID_PROFILE_NAME"),
      preferredLanguage: dto.profile_summary?.preferred_language || "Español",
      description: dto.profile_summary?.description || "",
    },
    invoices: {
      availableDocumentsCount: dto.invoices_summary?.available_documents_count ?? 0,
      description: dto.invoices_summary?.description || "",
    },
    rewards: {
      tierName: dto.rewards_summary?.tier_name || "Member",
      currentNights: dto.rewards_summary?.current_nights ?? 0,
      targetNights: dto.rewards_summary?.target_nights ?? 0,
      nextTierName: dto.rewards_summary?.next_tier_name || "Gold",
      activeBenefitsCount: dto.rewards_summary?.active_benefits_count ?? 0,
      description: dto.rewards_summary?.description || "",
    },
    messages: {
      unreadCount: dto.messages_summary?.unread_count ?? 0,
      description: dto.messages_summary?.description || "",
    },
    promotions: {
      eligibleOffersCount: dto.promotions_summary?.eligible_offers_count ?? 0,
      featuredOfferTitle: dto.promotions_summary?.featured_offer_title || "",
      description: dto.promotions_summary?.description || "",
    },
  };
}

export function mapStayHistoryItem(dto: StayHistoryItemDTO): StayHistoryItem {
  return {
    reservationCode: requiredText(dto.reservation_code, "INVALID_RESERVATION_CODE"),
    roomCategory: requiredText(dto.room_category, "INVALID_ROOM_CATEGORY"),
    nightsCount: dto.nights_count,
    totalAmountFormatted: requiredText(dto.total_amount_formatted, "INVALID_TOTAL_AMOUNT"),
    dateRangeLabel: requiredText(dto.date_range_label, "INVALID_DATE_RANGE"),
    guestName: requiredText(dto.guest_name, "INVALID_GUEST_NAME"),
    stayId: requiredText(dto.stay_id, "INVALID_STAY_ID"),
    status: dto.status || "COMPLETADA",
  };
}

function dateOnly(value: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)
      || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) {
    throw new DomainMappingError("INVALID_STAY_DATE");
  }
  return value;
}

export function mapAccountSummary(dto: AccountSummaryDTO): RealAccountSummary {
  if (!dto || !Array.isArray(dto.profiles) || typeof dto.active !== "boolean"
      || !Number.isSafeInteger(dto.linkedReservationsCount) || dto.linkedReservationsCount < 0
      || dto.upcomingStay === undefined) throw new DomainMappingError("INVALID_ACCOUNT_SUMMARY");
  const profiles = dto.profiles.map(p => {
    if (!p || !["ACTIVE", "INACTIVE"].includes(p.status)
        || (p.preferredLanguage !== null && typeof p.preferredLanguage !== "string")) {
      throw new DomainMappingError("INVALID_ACCOUNT_PROFILE");
    }
    return { id: requiredText(p.profileId, "INVALID_PROFILE_ID"),
      firstName: requiredText(p.firstName, "INVALID_PROFILE_NAME"), lastName: requiredText(p.lastName, "INVALID_PROFILE_NAME"),
      preferredLanguage: p.preferredLanguage, status: p.status };
  });
  const stay = dto.upcomingStay;
  const upcomingStay = stay === null ? null : {
    reservationId: requiredText(stay.reservationId, "INVALID_RESERVATION_ID"),
    stayId: requiredText(stay.stayId, "INVALID_STAY_ID"),
    confirmationCode: requiredText(stay.confirmationCode, "INVALID_RESERVATION_CODE"),
    arrival: dateOnly(stay.arrival), departure: dateOnly(stay.departure),
  };
  if (upcomingStay && (upcomingStay.arrival >= upcomingStay.departure || dto.linkedReservationsCount === 0)) {
    throw new DomainMappingError("INVALID_UPCOMING_STAY");
  }
  return { source: "real", accountId: requiredText(dto.guestAccountId, "INVALID_ACCOUNT_ID"),
    email: requiredText(dto.email, "INVALID_GUEST_EMAIL"), isActive: dto.active, profiles,
    profileId: profiles.length === 1 ? profiles[0].id : null,
    linkedReservationsCount: dto.linkedReservationsCount, upcomingStay };
}
