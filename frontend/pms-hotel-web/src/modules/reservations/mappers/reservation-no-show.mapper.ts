import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import type { NoShowApplyDto, NoShowPreviewDto } from "../dtos/reservation-no-show.dto";
import type { NoShowPreview, NoShowResult } from "../model/reservation-no-show";

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

  return parseDate(value, "INVALID_NO_SHOW_CUTOFF_AT");
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
    markedAt: parseDate(dto.marked_at, "INVALID_NO_SHOW_MARKED_AT"),
    allowedCharge: parseAmount(dto.allowed_charge, "INVALID_NO_SHOW_CHARGE"),
    message: requiredText(dto.message, "INVALID_NO_SHOW_MESSAGE"),
  };
}
