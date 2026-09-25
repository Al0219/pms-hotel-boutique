import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { describe, expect, it } from "vitest";

import type { CancellationApplyDto, CancellationPreviewDto } from "../dtos/reservation-cancellation.dto";
import { mapCancellationApply, mapCancellationPreview } from "./reservation-cancellation.mapper";

function previewDto(overrides: Partial<CancellationPreviewDto> = {}): CancellationPreviewDto {
  return {
    reservation_id: "HB-2026-08421",
    policy_summary: "Flexible 48h · Viajes Maya: hasta 48h antes cancelación gratuita.",
    cutoff_at: "2026-08-26T15:00:00",
    penalty_amount: "1160",
    refund_amount: "0",
    release_note: "Deluxe King 203 · 28–31 ago",
    can_cancel: true,
    reason: null,
    ...overrides,
  };
}

describe("mapCancellationPreview", () => {
  it("maps the policy projection with amounts and release note", () => {
    expect(mapCancellationPreview(previewDto())).toEqual({
      reservationId: "HB-2026-08421",
      policySummary: "Flexible 48h · Viajes Maya: hasta 48h antes cancelación gratuita.",
      cutoffAt: new Date("2026-08-26T15:00:00"),
      penaltyAmount: 1160,
      refundAmount: 0,
      releaseNote: "Deluxe King 203 · 28–31 ago",
      canCancel: true,
      reason: null,
    });
  });

  it("keeps cutoff null and the block reason when Backend rejects the cancellation", () => {
    const preview = mapCancellationPreview(
      previewDto({ cutoff_at: null, can_cancel: false, reason: "Fuera de ventana: penalización 100%." }),
    );

    expect(preview.cutoffAt).toBeNull();
    expect(preview.canCancel).toBe(false);
    expect(preview.reason).toBe("Fuera de ventana: penalización 100%.");
  });

  it("rejects invalid projected amounts", () => {
    expect(() => mapCancellationPreview(previewDto({ penalty_amount: "Q1,160" }))).toThrow(DomainMappingError);
  });

  it("rejects an invalid cutoff datetime", () => {
    expect(() => mapCancellationPreview(previewDto({ cutoff_at: "28 ago 2026" }))).toThrow(DomainMappingError);
  });
});

describe("mapCancellationApply", () => {
  it("maps the confirmed CANCELLED result", () => {
    const result = mapCancellationApply({
      reservation_id: "HB-2026-08421",
      status: "CANCELLED",
      cancelled_at: "2026-08-28T09:30:00",
      penalty_amount: "1160",
      refund_amount: "0",
      message: "Penalty Charge Q1,160 · Refund Q 0 · ATS +1/noche",
    } satisfies CancellationApplyDto);

    expect(result).toEqual({
      reservationId: "HB-2026-08421",
      status: "CANCELLED",
      cancelledAt: new Date("2026-08-28T09:30:00"),
      penaltyAmount: 1160,
      refundAmount: 0,
      message: "Penalty Charge Q1,160 · Refund Q 0 · ATS +1/noche",
    });
  });

  it("rejects a response that is not CANCELLED (no invented final state)", () => {
    expect(() => mapCancellationApply({
      reservation_id: "HB-2026-08421",
      status: "NO_SHOW",
      cancelled_at: "2026-08-28T09:30:00",
      penalty_amount: "0",
      refund_amount: "0",
      message: "ok",
    } as unknown as CancellationApplyDto)).toThrow(DomainMappingError);
  });
});