import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import type {
  ReservationAlertItemDto,
  ReservationCenterDto,
  ReservationCenterSummaryDto,
  ReservationListItemDto,
} from "../dtos/reservation-list.dto";
import type {
  ReservationAlertItem,
  ReservationCenterData,
  ReservationCenterSummary,
  ReservationFinancialSummary,
  ReservationListItem,
} from "../model/reservation-summary";

function requiredText(value: string, errorCode: string): string {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    throw new DomainMappingError(errorCode);
  }

  return normalizedValue;
}

function optionalText(value: string | null): string | null {
  const normalizedValue = value?.trim();
  return normalizedValue || null;
}

function requiredNumber(value: number, errorCode: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new DomainMappingError(errorCode);
  }

  return value;
}

function parseAmount(value: string, errorCode: string): number {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new DomainMappingError(errorCode);
  }

  return amount;
}

function parseDate(value: string, errorCode: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new DomainMappingError(errorCode);
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    throw new DomainMappingError(errorCode);
  }

  return date;
}

function mapFinance(dto: ReservationListItemDto): ReservationFinancialSummary {
  return {
    totalAmount: parseAmount(dto.total_amount, "INVALID_RESERVATION_TOTAL_AMOUNT"),
    paidAmount: dto.paid_amount === null ? null : parseAmount(dto.paid_amount, "INVALID_RESERVATION_PAID_AMOUNT"),
    financeState: requiredText(dto.finance_state, "INVALID_RESERVATION_FINANCE_STATE") as ReservationFinancialSummary["financeState"],
  };
}

export function mapReservationListItem(dto: ReservationListItemDto): ReservationListItem {
  return {
    id: requiredText(dto.reservation_id, "INVALID_RESERVATION_ID"),
    propertyId: requiredText(dto.property_id, "INVALID_RESERVATION_PROPERTY_ID"),
    guestName: requiredText(dto.guest_name, "INVALID_RESERVATION_GUEST_NAME"),
    sourceLabel: requiredText(dto.source_label, "INVALID_RESERVATION_SOURCE_LABEL"),
    sourceReference: optionalText(dto.source_reference),
    roomLabel: optionalText(dto.room_label),
    stayStart: parseDate(dto.stay_start, "INVALID_RESERVATION_STAY_START"),
    stayEnd: parseDate(dto.stay_end, "INVALID_RESERVATION_STAY_END"),
    nights: requiredNumber(dto.nights, "INVALID_RESERVATION_NIGHTS"),
    adults: requiredNumber(dto.adults, "INVALID_RESERVATION_ADULTS"),
    roomCount: dto.room_count === null ? null : requiredNumber(dto.room_count, "INVALID_RESERVATION_ROOM_COUNT"),
    currency: requiredText(dto.currency, "INVALID_RESERVATION_CURRENCY"),
    finance: mapFinance(dto),
    alertText: optionalText(dto.alert_text),
    status: requiredText(dto.status, "INVALID_RESERVATION_STATUS") as ReservationListItem["status"],
    statusDetail: optionalText(dto.status_detail),
  };
}

function mapAlert(dto: ReservationAlertItemDto): ReservationAlertItem {
  return {
    id: requiredText(dto.alert_id, "INVALID_RESERVATION_ALERT_ID"),
    kind: requiredText(dto.kind, "INVALID_RESERVATION_ALERT_KIND"),
    message: requiredText(dto.message, "INVALID_RESERVATION_ALERT_MESSAGE"),
  };
}

function mapSummary(dto: ReservationCenterSummaryDto): ReservationCenterSummary {
  return {
    arrivalsToday: requiredNumber(dto.arrivals_today, "INVALID_RESERVATION_SUMMARY_ARRIVALS"),
    departuresToday: requiredNumber(dto.departures_today, "INVALID_RESERVATION_SUMMARY_DEPARTURES"),
    vipToday: requiredNumber(dto.vip_today, "INVALID_RESERVATION_SUMMARY_VIP"),
    multiRoomToday: requiredNumber(dto.multi_room_today, "INVALID_RESERVATION_SUMMARY_MULTI_ROOM"),
    lateCheckoutToday: requiredNumber(dto.late_checkout_today, "INVALID_RESERVATION_SUMMARY_LATE_CHECKOUT"),
    alerts: requiredNumber(dto.alerts, "INVALID_RESERVATION_SUMMARY_ALERTS"),
    confirmedNextDays: requiredNumber(dto.confirmed_next_days, "INVALID_RESERVATION_SUMMARY_CONFIRMED_NEXT"),
    decisionsRequired: requiredNumber(dto.decisions_required, "INVALID_RESERVATION_SUMMARY_DECISIONS"),
    total: requiredNumber(dto.total, "INVALID_RESERVATION_SUMMARY_TOTAL"),
  };
}

export function mapReservationCenter(dto: ReservationCenterDto): ReservationCenterData {
  return {
    summary: mapSummary(dto.summary),
    alerts: dto.alerts.map(mapAlert),
    reservations: dto.reservations.map(mapReservationListItem),
  };
}