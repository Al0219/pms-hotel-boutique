import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { optionalText, parseAmount, parseDateTime, requiredText } from "@/lib/mapper";

import type { CancellationApplyDto, CancellationPreviewDto } from "../dtos/reservation-cancellation.dto";
import type { CancellationPreview, CancellationResult } from "../model/reservation-cancellation";

function parseOptionalDate(value: string | null): Date | null {
  if (value === null) {
    return null;
  }

  return parseDateTime(value, "INVALID_CANCELLATION_CUTOFF_AT");
}

export function mapCancellationPreview(dto: CancellationPreviewDto): CancellationPreview {
  return {
    reservationId: requiredText(dto.reservation_id, "INVALID_CANCELLATION_RESERVATION_ID"),
    policySummary: requiredText(dto.policy_summary, "INVALID_CANCELLATION_POLICY_SUMMARY"),
    cutoffAt: parseOptionalDate(dto.cutoff_at),
    penaltyAmount: parseAmount(dto.penalty_amount, "INVALID_CANCELLATION_PENALTY"),
    refundAmount: parseAmount(dto.refund_amount, "INVALID_CANCELLATION_REFUND"),
    releaseNote: optionalText(dto.release_note),
    canCancel: dto.can_cancel === true,
    reason: optionalText(dto.reason),
  };
}

export function mapCancellationApply(dto: CancellationApplyDto): CancellationResult {
  const status = requiredText(dto.status, "INVALID_CANCELLATION_STATUS");

  if (status !== "CANCELLED") {
    throw new DomainMappingError("INVALID_CANCELLATION_STATUS");
  }

  return {
    reservationId: requiredText(dto.reservation_id, "INVALID_CANCELLATION_RESERVATION_ID"),
    status,
    cancelledAt: parseDateTime(dto.cancelled_at, "INVALID_CANCELLATION_CANCELLED_AT"),
    penaltyAmount: parseAmount(dto.penalty_amount, "INVALID_CANCELLATION_PENALTY"),
    refundAmount: parseAmount(dto.refund_amount, "INVALID_CANCELLATION_REFUND"),
    message: requiredText(dto.message, "INVALID_CANCELLATION_MESSAGE"),
  };
}