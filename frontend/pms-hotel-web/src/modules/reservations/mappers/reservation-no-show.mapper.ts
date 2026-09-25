import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { optionalText, parseAmount, parseDateTime, requiredText } from "@/lib/mapper";

import type { NoShowApplyDto, NoShowPreviewDto } from "../dtos/reservation-no-show.dto";
import type { NoShowPreview, NoShowResult } from "../model/reservation-no-show";

function parseOptionalDate(value: string | null): Date | null {
  if (value === null) {
    return null;
  }

  return parseDateTime(value, "INVALID_NO_SHOW_CUTOFF_AT");
}

export function mapNoShowPreview(dto: NoShowPreviewDto): NoShowPreview {
  return {
    reservationId: requiredText(dto.reservation_id, "INVALID_NO_SHOW_RESERVATION_ID"),
    policySummary: requiredText(dto.policy_summary, "INVALID_NO_SHOW_POLICY_SUMMARY"),
    cutoffAt: parseOptionalDate(dto.cutoff_at),
    allowedCharge: parseAmount(dto.allowed_charge, "INVALID_NO_SHOW_CHARGE"),
    releaseNote: optionalText(dto.release_note),
    canMarkNoShow: dto.can_mark_no_show === true,
    reason: optionalText(dto.reason),
  };
}

export function mapNoShowApply(dto: NoShowApplyDto): NoShowResult {
  const status = requiredText(dto.status, "INVALID_NO_SHOW_STATUS");

  if (status !== "NO_SHOW") {
    throw new DomainMappingError("INVALID_NO_SHOW_STATUS");
  }

  return {
    reservationId: requiredText(dto.reservation_id, "INVALID_NO_SHOW_RESERVATION_ID"),
    status,
    markedAt: parseDateTime(dto.marked_at, "INVALID_NO_SHOW_MARKED_AT"),
    allowedCharge: parseAmount(dto.allowed_charge, "INVALID_NO_SHOW_CHARGE"),
    message: requiredText(dto.message, "INVALID_NO_SHOW_MESSAGE"),
  };
}
