import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { optionalText, parseAmount, parseCount, parseDay, parseDateTime, requiredText } from "@/lib/mapper";

import type {
  StayExtensionApplyDto,
  StayExtensionPreviewDto,
} from "../dtos/stay-extension.dto";
import type { StayExtensionPreview, StayExtensionResult } from "../model/stay-extension";

export function mapStayExtensionPreview(dto: StayExtensionPreviewDto): StayExtensionPreview {
  const currentStay = dto.current_stay;

  return {
    reservationId: requiredText(dto.reservation_id, "INVALID_STAY_EXTENSION_RESERVATION_ID"),
    stayId: requiredText(dto.stay_id, "INVALID_STAY_EXTENSION_STAY_ID"),
    guestName: requiredText(dto.guest_name, "INVALID_STAY_EXTENSION_GUEST_NAME"),
    currentStay: {
      roomLabel: requiredText(currentStay.room_label, "INVALID_STAY_EXTENSION_ROOM_LABEL"),
      roomType: requiredText(currentStay.room_type, "INVALID_STAY_EXTENSION_ROOM_TYPE"),
      checkIn: parseDay(currentStay.check_in, "INVALID_STAY_EXTENSION_CHECK_IN"),
      checkOut: parseDay(currentStay.check_out, "INVALID_STAY_EXTENSION_CHECK_OUT"),
      nights: parseCount(currentStay.nights, "INVALID_STAY_EXTENSION_NIGHTS"),
    },
    requestedDeparture: parseDay(dto.requested_departure, "INVALID_STAY_EXTENSION_REQUESTED_DEPARTURE"),
    extraNights: parseCount(dto.extra_nights, "INVALID_STAY_EXTENSION_EXTRA_NIGHTS"),
    ratePerNight: parseAmount(dto.rate_per_night, "INVALID_STAY_EXTENSION_RATE_PER_NIGHT"),
    rateConfirmed: dto.rate_confirmed === true,
    rateConfirmation: requiredText(dto.rate_confirmation, "INVALID_STAY_EXTENSION_RATE_CONFIRMATION"),
    availabilityConfirmed: dto.availability_confirmed === true,
    availabilityNote: optionalText(dto.availability_note),
    deltaAmount: parseAmount(dto.delta_amount, "INVALID_STAY_EXTENSION_DELTA_AMOUNT"),
    newTotalAmount: parseAmount(dto.new_total_amount, "INVALID_STAY_EXTENSION_NEW_TOTAL_AMOUNT"),
    currency: requiredText(dto.currency, "INVALID_STAY_EXTENSION_CURRENCY"),
    inventoryNote: optionalText(dto.inventory_note),
    calendarNote: optionalText(dto.calendar_note),
    folioNote: optionalText(dto.folio_note),
    canExtend: dto.can_extend === true,
    reason: optionalText(dto.reason),
  };
}

export function mapStayExtensionApply(dto: StayExtensionApplyDto): StayExtensionResult {
  const status = requiredText(dto.status, "INVALID_STAY_EXTENSION_STATUS");

  if (status !== "EXTENDED") {
    throw new DomainMappingError("INVALID_STAY_EXTENSION_STATUS");
  }

  return {
    reservationId: requiredText(dto.reservation_id, "INVALID_STAY_EXTENSION_RESERVATION_ID"),
    stayId: requiredText(dto.stay_id, "INVALID_STAY_EXTENSION_STAY_ID"),
    status,
    previousDeparture: parseDay(dto.previous_departure, "INVALID_STAY_EXTENSION_PREVIOUS_DEPARTURE"),
    newDeparture: parseDay(dto.new_departure, "INVALID_STAY_EXTENSION_NEW_DEPARTURE"),
    extraNights: parseCount(dto.extra_nights, "INVALID_STAY_EXTENSION_EXTRA_NIGHTS"),
    nights: parseCount(dto.nights, "INVALID_STAY_EXTENSION_NIGHTS"),
    ratePerNight: parseAmount(dto.rate_per_night, "INVALID_STAY_EXTENSION_RATE_PER_NIGHT"),
    deltaAmount: parseAmount(dto.delta_amount, "INVALID_STAY_EXTENSION_DELTA_AMOUNT"),
    extendedAt: parseDateTime(dto.extended_at, "INVALID_STAY_EXTENSION_EXTENDED_AT"),
    auditSummary: requiredText(dto.audit_summary, "INVALID_STAY_EXTENSION_AUDIT_SUMMARY"),
    message: requiredText(dto.message, "INVALID_STAY_EXTENSION_MESSAGE"),
  };
}