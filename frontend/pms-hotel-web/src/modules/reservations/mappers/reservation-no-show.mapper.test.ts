import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { describe, expect, it } from "vitest";

import type { NoShowApplyDto, NoShowPreviewDto } from "../dtos/reservation-no-show.dto";
import { mapNoShowApply, mapNoShowPreview } from "./reservation-no-show.mapper";

function previewDto(overrides: Partial<NoShowPreviewDto> = {}): NoShowPreviewDto {
  return {
    reservation_id: "HB-2026-08112",
    policy_summary: "No-show: cargo de una noche + impuestos.",
    cutoff_at: "2026-08-27T18:00:00",
    allowed_charge: "470",
    release_note: "Estándar Doble 101 · 27–29 ago",
    can_mark_no_show: true,
    reason: null,
    ...overrides,
  };
}

describe("mapNoShowPreview", () => {
  it("maps the policy projection with charge and release note", () => {
    expect(mapNoShowPreview(previewDto())).toEqual({
      reservationId: "HB-2026-08112",
      policySummary: "No-show: cargo de una noche + impuestos.",
      cutoffAt: new Date("2026-08-27T18:00:00"),
      allowedCharge: 470,
      releaseNote: "Estándar Doble 101 · 27–29 ago",
      canMarkNoShow: true,
      reason: null,
    });
  });

  it("keeps cutoff null and the block reason when Backend rejects the action", () => {
    const preview = mapNoShowPreview(
      previewDto({ cutoff_at: null, can_mark_no_show: false, reason: "La reserva ya fue cancelada." }),
    );

    expect(preview.cutoffAt).toBeNull();
    expect(preview.canMarkNoShow).toBe(false);
    expect(preview.reason).toBe("La reserva ya fue cancelada.");
  });

  it("rejects invalid projected charge", () => {
    expect(() => mapNoShowPreview(previewDto({ allowed_charge: "Q470" }))).toThrow(DomainMappingError);
  });

  it("rejects an invalid cutoff datetime", () => {
    expect(() => mapNoShowPreview(previewDto({ cutoff_at: "27 ago 2026" }))).toThrow(DomainMappingError);
  });
});

describe("mapNoShowApply", () => {
  it("maps the confirmed NO_SHOW result", () => {
    const result = mapNoShowApply({
      reservation_id: "HB-2026-08112",
      status: "NO_SHOW",
      marked_at: "2026-08-28T18:15:00",
      allowed_charge: "470",
      message: "No-show: cargo Q470 · ATS +1/noche",
    } satisfies NoShowApplyDto);

    expect(result).toEqual({
      reservationId: "HB-2026-08112",
      status: "NO_SHOW",
      markedAt: new Date("2026-08-28T18:15:00"),
      allowedCharge: 470,
      message: "No-show: cargo Q470 · ATS +1/noche",
    });
  });

  it("rejects a response that is not NO_SHOW (no invented final state)", () => {
    expect(() => mapNoShowApply({
      reservation_id: "HB-2026-08112",
      status: "CONFIRMED",
      marked_at: "2026-08-28T18:15:00",
      allowed_charge: "0",
      message: "ok",
    } as unknown as NoShowApplyDto)).toThrow(DomainMappingError);
  });
});
