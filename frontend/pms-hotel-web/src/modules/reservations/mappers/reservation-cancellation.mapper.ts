import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import type { CancellationApplyDto, CancellationPreviewDto } from "../dtos/reservation-cancellation.dto";
import type { CancellationPreview, CancellationResult } from "../model/reservation-cancellation";

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

function parseAmount(value: string, errorCode: string): number {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new DomainMappingError(errorCode);
  }

  return amount;
}

function parseDate(value: string, errorCode: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    throw new DomainMappingError(errorCode);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new DomainMappingError(errorCode);
  }

  return date;
}

function parseOptionalDate(value: string | null): Date | null {
  if (value === null) {
    return null;
  }

  return parseDate(value, "INVALID_CANCELLATION_CUTOFF_AT");
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
    cancelledAt: parseDate(dto.cancelled_at, "INVALID_CANCELLATION_CANCELLED_AT"),
    penaltyAmount: parseAmount(dto.penalty_amount, "INVALID_CANCELLATION_PENALTY"),
    refundAmount: parseAmount(dto.refund_amount, "INVALID_CANCELLATION_REFUND"),
    message: requiredText(dto.message, "INVALID_CANCELLATION_MESSAGE"),
  };
}