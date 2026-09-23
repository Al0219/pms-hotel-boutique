import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { optionalText, parseAmount, parseDay, requiredNumber, requiredText } from "@/lib/mapper";

import type {
  WaitlistAvailabilityDto,
  WaitlistConversionPreviewDto,
  WaitlistConversionResultDto,
} from "../dtos/waitlist.dto";
import type { WaitlistAvailability, WaitlistConversionPreview, WaitlistConversionResult } from "../model/waitlist";

function mapAvailability(dto: WaitlistAvailabilityDto): WaitlistAvailability {
  return {
    roomType: requiredText(dto.room_type, "INVALID_WAITLIST_AVAILABILITY_ROOM_TYPE"),
    availableFrom: parseDay(dto.available_from, "INVALID_WAITLIST_AVAILABILITY_FROM"),
    availableUntil: parseDay(dto.available_until, "INVALID_WAITLIST_AVAILABILITY_UNTIL"),
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
    checkIn: parseDay(dto.check_in, "INVALID_WAITLIST_CHECK_IN"),
    checkOut: parseDay(dto.check_out, "INVALID_WAITLIST_CHECK_OUT"),
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