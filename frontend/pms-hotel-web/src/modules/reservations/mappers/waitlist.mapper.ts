import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import type {
  WaitlistAvailabilityDto,
  WaitlistConversionPreviewDto,
  WaitlistConversionResultDto,
} from "../dtos/waitlist.dto";
import type { WaitlistAvailability, WaitlistConversionPreview, WaitlistConversionResult } from "../model/waitlist";

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

function mapAvailability(dto: WaitlistAvailabilityDto): WaitlistAvailability {
  return {
    roomType: requiredText(dto.room_type, "INVALID_WAITLIST_AVAILABILITY_ROOM_TYPE"),
    availableFrom: parseDate(dto.available_from, "INVALID_WAITLIST_AVAILABILITY_FROM"),
    availableUntil: parseDate(dto.available_until, "INVALID_WAITLIST_AVAILABILITY_UNTIL"),
    ratePlan: requiredText(dto.rate_plan, "INVALID_WAITLIST_AVAILABILITY_RATE_PLAN"),
    ratePerNight: parseAmount(dto.rate_per_night, "INVALID_WAITLIST_AVAILABILITY_RATE"),
    totalEstimated: parseAmount(dto.total_estimated, "INVALID_WAITLIST_AVAILABILITY_TOTAL"),
    note: optionalText(dto.note),
  };
}

export function mapWaitlistConversionPreview(dto: WaitlistConversionPreviewDto): WaitlistConversionPreview {
  return {
    id: requiredText(dto.waitlist_id, "INVALID_WAITLIST_ID"),
    guestName: requiredText(dto.guest_name, "INVALID_WAITLIST_GUEST_NAME"),
    sourceLabel: requiredText(dto.source_label, "INVALID_WAITLIST_SOURCE_LABEL"),
    roomTypeLabel: requiredText(dto.room_type_label, "INVALID_WAITLIST_ROOM_TYPE"),
    checkIn: parseDate(dto.check_in, "INVALID_WAITLIST_CHECK_IN"),
    checkOut: parseDate(dto.check_out, "INVALID_WAITLIST_CHECK_OUT"),
    nights: requiredNumber(dto.nights, "INVALID_WAITLIST_NIGHTS"),
    adults: requiredNumber(dto.adults, "INVALID_WAITLIST_ADULTS"),
    priority: requiredNumber(dto.priority, "INVALID_WAITLIST_PRIORITY"),
    queueLabel: requiredText(dto.queue_label, "INVALID_WAITLIST_QUEUE_LABEL"),
    preferences: optionalText(dto.preferences),
    originalEstimatedAmount: parseAmount(dto.original_estimated_amount, "INVALID_WAITLIST_ORIGINAL_AMOUNT"),
    availability: dto.availability === null ? null : mapAvailability(dto.availability),
  };
}

export function mapWaitlistConversionResult(dto: WaitlistConversionResultDto): WaitlistConversionResult {
  const reservationId = requiredText(dto.reservation_id, "INVALID_WAITLIST_RESERVATION_ID");
  const status = requiredText(dto.status, "INVALID_WAITLIST_STATUS");

  if (status !== "CONVERTED") {
    throw new DomainMappingError("INVALID_WAITLIST_STATUS");
  }

  return {
    waitlistId: requiredText(dto.waitlist_id, "INVALID_WAITLIST_ID"),
    reservationId,
    status,
    message: requiredText(dto.message, "INVALID_WAITLIST_RESULT_MESSAGE"),
  };
}