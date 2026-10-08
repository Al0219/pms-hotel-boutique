import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { describe, expect, it } from "vitest";

import type { StayExtensionApplyDto, StayExtensionPreviewDto } from "../dtos/stay-extension.dto";
import { mapStayExtensionApply, mapStayExtensionPreview } from "./stay-extension.mapper";

function previewDto(overrides: Partial<StayExtensionPreviewDto> = {}): StayExtensionPreviewDto {
  return {
    reservation_id: "HB-2026-08421",
    stay_id: "STAY-2026-08421-A",
    guest_name: "María Fernández",
    current_stay: {
      room_label: "203",
      room_type: "Deluxe King",
      check_in: "2026-08-28",
      check_out: "2026-08-31",
      nights: 3,
    },
    requested_departure: "2026-09-02",
    extra_nights: 2,
    rate_per_night: "1160",
    rate_confirmed: true,
    rate_confirmation: "Tarifa Deluxe King · 1,160 GTQ/noche confirmada.",
    availability_confirmed: true,
    availability_note: "Deluxe King 203 disponible · 31 ago – 2 sep.",
    delta_amount: "2320",
    new_total_amount: "5800",
    currency: "GTQ",
    inventory_note: "ReservationStay A · 28 ago → 2 sep · ATS -2/noche.",
    calendar_note: "Calendario: 203 reservada hasta 2 sep.",
    folio_note: "Mismo folio · se agrega cargo por 2 noches adicionales.",
    can_extend: true,
    reason: null,
    ...overrides,
  };
}

describe("mapStayExtensionPreview", () => {
  it("maps the extension projection with validated rate, availability and finance delta", () => {
    expect(mapStayExtensionPreview(previewDto())).toEqual({
      reservationId: "HB-2026-08421",
      stayId: "STAY-2026-08421-A",
      guestName: "María Fernández",
      currentStay: {
        roomLabel: "203",
        roomType: "Deluxe King",
        checkIn: new Date("2026-08-28T00:00:00"),
        checkOut: new Date("2026-08-31T00:00:00"),
        nights: 3,
      },
      requestedDeparture: new Date("2026-09-02T00:00:00"),
      extraNights: 2,
      ratePerNight: 1160,
      rateConfirmed: true,
      rateConfirmation: "Tarifa Deluxe King · 1,160 GTQ/noche confirmada.",
      availabilityConfirmed: true,
      availabilityNote: "Deluxe King 203 disponible · 31 ago – 2 sep.",
      deltaAmount: 2320,
      newTotalAmount: 5800,
      currency: "GTQ",
      inventoryNote: "ReservationStay A · 28 ago → 2 sep · ATS -2/noche.",
      calendarNote: "Calendario: 203 reservada hasta 2 sep.",
      folioNote: "Mismo folio · se agrega cargo por 2 noches adicionales.",
      canExtend: true,
      reason: null,
    });
  });

  it("keeps the block reason when Backend denies the extension", () => {
    const preview = mapStayExtensionPreview(
      previewDto({ can_extend: false, reason: "La estadía está por salir; no se puede extender." }),
    );

    expect(preview.canExtend).toBe(false);
    expect(preview.reason).toBe("La estadía está por salir; no se puede extender.");
  });

  it("keeps null operational notes when Backend sends none", () => {
    const preview = mapStayExtensionPreview(
      previewDto({ availability_note: null, inventory_note: null, folio_note: null }),
    );

    expect(preview.availabilityNote).toBeNull();
    expect(preview.inventoryNote).toBeNull();
    expect(preview.folioNote).toBeNull();
  });

  it("rejects an invalid requested departure date", () => {
    expect(() =>
      mapStayExtensionPreview(previewDto({ requested_departure: "02/09/2026" })),
    ).toThrow(DomainMappingError);
  });

  it("rejects an invalid delta amount", () => {
    expect(() =>
      mapStayExtensionPreview(previewDto({ delta_amount: "Q2,320" })),
    ).toThrow(DomainMappingError);
  });

  it("rejects a missing rate confirmation", () => {
    expect(() =>
      mapStayExtensionPreview(previewDto({ rate_confirmation: " " })),
    ).toThrow(DomainMappingError);
  });
});

describe("mapStayExtensionApply", () => {
  it("maps the confirmed EXTENDED result", () => {
    const result = mapStayExtensionApply({
      reservation_id: "HB-2026-08421",
      stay_id: "STAY-2026-08421-A",
      status: "EXTENDED",
      previous_departure: "2026-08-31",
      new_departure: "2026-09-02",
      extra_nights: 2,
      nights: 5,
      rate_per_night: "1160",
      delta_amount: "2320",
      extended_at: "2026-08-29T11:30:00",
      audit_summary: "EXTENDED 31 ago → 2 sep · ReservationStay actualizado · Inventario y calendario actualizados",
      message: "Cargo adicional Q2,320 · ATS -2/noche · AuditTrail STAY_EXTENDED",
    } satisfies StayExtensionApplyDto);

    expect(result).toEqual({
      reservationId: "HB-2026-08421",
      stayId: "STAY-2026-08421-A",
      status: "EXTENDED",
      previousDeparture: new Date("2026-08-31T00:00:00"),
      newDeparture: new Date("2026-09-02T00:00:00"),
      extraNights: 2,
      nights: 5,
      ratePerNight: 1160,
      deltaAmount: 2320,
      extendedAt: new Date("2026-08-29T11:30:00"),
      auditSummary: "EXTENDED 31 ago → 2 sep · ReservationStay actualizado · Inventario y calendario actualizados",
      message: "Cargo adicional Q2,320 · ATS -2/noche · AuditTrail STAY_EXTENDED",
    });
  });

  it("rejects a response that is not EXTENDED (no invented final state)", () => {
    expect(() => mapStayExtensionApply({
      reservation_id: "HB-2026-08421",
      stay_id: "STAY-2026-08421-A",
      status: "CHECKED_OUT",
      previous_departure: "2026-08-31",
      new_departure: "2026-09-02",
      extra_nights: 2,
      nights: 5,
      rate_per_night: "1160",
      delta_amount: "2320",
      extended_at: "2026-08-29T11:30:00",
      audit_summary: "ok",
      message: "ok",
    } as unknown as StayExtensionApplyDto)).toThrow(DomainMappingError);
  });

  it("rejects a malformed previous departure", () => {
    expect(() => mapStayExtensionApply({
      reservation_id: "HB-2026-08421",
      stay_id: "STAY-2026-08421-A",
      status: "EXTENDED",
      previous_departure: "31 ago 2026",
      new_departure: "2026-09-02",
      extra_nights: 2,
      nights: 5,
      rate_per_night: "1160",
      delta_amount: "2320",
      extended_at: "2026-08-29T11:30:00",
      audit_summary: "ok",
      message: "ok",
    })).toThrow(DomainMappingError);
  });
});