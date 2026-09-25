import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { describe, expect, it } from "vitest";

import type { WaitlistConversionPreviewDto, WaitlistConversionResultDto } from "../dtos/waitlist.dto";
import { mapWaitlistConversionPreview, mapWaitlistConversionResult } from "./waitlist.mapper";

function previewDto(overrides: Partial<WaitlistConversionPreviewDto> = {}): WaitlistConversionPreviewDto {
  return {
    waitlist_id: "WAIT-0007",
    guest_name: "Laura Méndez",
    source_label: "Web directa",
    room_type_label: "Deluxe King",
    check_in: "2026-09-10",
    check_out: "2026-09-12",
    nights: 2,
    adults: 2,
    priority: 1,
    queue_label: "3 solicitudes en cola",
    preferences: "Habitación tranquila · piso alto si está disponible.",
    original_estimated_amount: "2250",
    availability: {
      room_type: "Deluxe King",
      available_from: "2026-09-10",
      available_until: "2026-09-12",
      rate_plan: "BAR Flexible",
      rate_per_night: "1125",
      total_estimated: "2250",
      note: "2 noches · impuestos/servicio según rate plan.",
    },
    ...overrides,
  };
}

describe("mapWaitlistConversionPreview", () => {
  it("maps a preview with availability to Domain data", () => {
    const preview = mapWaitlistConversionPreview(previewDto());

    expect(preview).toEqual({
      id: "WAIT-0007",
      guestName: "Laura Méndez",
      sourceLabel: "Web directa",
      roomTypeLabel: "Deluxe King",
      checkIn: new Date("2026-09-10T00:00:00"),
      checkOut: new Date("2026-09-12T00:00:00"),
      nights: 2,
      adults: 2,
      priority: 1,
      queueLabel: "3 solicitudes en cola",
      preferences: "Habitación tranquila · piso alto si está disponible.",
      originalEstimatedAmount: 2250,
      availability: {
        roomType: "Deluxe King",
        availableFrom: new Date("2026-09-10T00:00:00"),
        availableUntil: new Date("2026-09-12T00:00:00"),
        ratePlan: "BAR Flexible",
        ratePerNight: 1125,
        totalEstimated: 2250,
        note: "2 noches · impuestos/servicio según rate plan.",
      },
    });
  });

  it("keeps availability null when the revalidation found nothing", () => {
    expect(mapWaitlistConversionPreview(previewDto({ availability: null })).availability).toBeNull();
  });

  it("rejects invalid financial data", () => {
    expect(() => mapWaitlistConversionPreview(previewDto({ original_estimated_amount: "abc" }))).toThrow(DomainMappingError);
  });
});

describe("mapWaitlistConversionResult", () => {
  it("maps a CONVERTED result", () => {
    const result = mapWaitlistConversionResult({
      waitlist_id: "WAIT-0007",
      reservation_id: "HB-2026-09128",
      status: "CONVERTED",
      message: "disponibilidad/tarifa revalidadas · WAITLIST_CONVERTED",
    } satisfies WaitlistConversionResultDto);

    expect(result).toEqual({
      waitlistId: "WAIT-0007",
      reservationId: "HB-2026-09128",
      status: "CONVERTED",
      message: "disponibilidad/tarifa revalidadas · WAITLIST_CONVERTED",
    });
  });

  it("rejects a success without a created reservation id", () => {
    expect(() => mapWaitlistConversionResult({
      waitlist_id: "WAIT-0007",
      reservation_id: "",
      status: "CONVERTED",
      message: "ok",
    } satisfies WaitlistConversionResultDto)).toThrow(DomainMappingError);
  });
});