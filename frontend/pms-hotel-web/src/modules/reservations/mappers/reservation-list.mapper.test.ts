import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { describe, expect, it } from "vitest";

import type { ReservationCenterDto, ReservationListItemDto } from "../dtos/reservation-list.dto";
import { mapReservationCenter, mapReservationListItem } from "./reservation-list.mapper";

function listItemDto(overrides: Partial<ReservationListItemDto> = {}): ReservationListItemDto {
  return {
    reservation_id: "HB-2026-08421",
    property_id: "GT-HB-01",
    guest_name: "María López",
    source_label: "Viajes Maya",
    source_reference: "VM-77821 · TA-MAYA-01",
    room_label: "203 · Deluxe King",
    stay_start: "2026-08-28",
    stay_end: "2026-08-31",
    nights: 3,
    adults: 2,
    room_count: 1,
    currency: "GTQ",
    total_amount: "3920",
    paid_amount: "2400",
    finance_state: "BALANCE",
    alert_text: "Garantía vence hoy 20:00",
    status: "CONFIRMED",
    status_detail: "Check-in 28 ago · 15:00",
    ...overrides,
  };
}

describe("mapReservationListItem", () => {
  it("maps a complete item to Domain data", () => {
    const item = mapReservationListItem(listItemDto());

    expect(item).toEqual({
      id: "HB-2026-08421",
      propertyId: "GT-HB-01",
      guestName: "María López",
      sourceLabel: "Viajes Maya",
      sourceReference: "VM-77821 · TA-MAYA-01",
      roomLabel: "203 · Deluxe King",
      stayStart: new Date("2026-08-28T00:00:00"),
      stayEnd: new Date("2026-08-31T00:00:00"),
      nights: 3,
      adults: 2,
      roomCount: 1,
      currency: "GTQ",
      finance: { totalAmount: 3920, paidAmount: 2400, financeState: "BALANCE" },
      alertText: "Garantía vence hoy 20:00",
      status: "CONFIRMED",
      statusDetail: "Check-in 28 ago · 15:00",
    });
  });

  it("throws DomainMappingError when the reservation id is missing", () => {
    expect(() => mapReservationListItem(listItemDto({ reservation_id: "  " }))).toThrow(DomainMappingError);
  });

  it("throws DomainMappingError when the stay date is not a valid date", () => {
    expect(() => mapReservationListItem(listItemDto({ stay_start: "28/08/2026" }))).toThrow(DomainMappingError);
  });

  it("throws DomainMappingError when the total amount is not a number", () => {
    expect(() => mapReservationListItem(listItemDto({ total_amount: "no-monto" }))).toThrow(DomainMappingError);
  });

  it("keeps null commercial references as null", () => {
    const item = mapReservationListItem(listItemDto({ source_reference: null, paid_amount: null }));

    expect(item.sourceReference).toBeNull();
    expect(item.finance.paidAmount).toBeNull();
  });
});

describe("mapReservationCenter", () => {
  it("maps summary, alerts and reservation list", () => {
    const center = mapReservationCenter({
      summary: {
        arrivals_today: 18,
        departures_today: 126,
        vip_today: 2,
        multi_room_today: 2,
        late_checkout_today: 2,
        alerts: 4,
        confirmed_next_days: 37,
        decisions_required: 2,
        total: 128,
      },
      alerts: [{ alert_id: "AL-1", kind: "NO_SHOW_PENDING", message: "No-show pendiente · HB-2026-08458 · llegada vencida 18:00" }],
      reservations: [listItemDto()],
    } satisfies ReservationCenterDto);

    expect(center.summary).toEqual({
      arrivalsToday: 18,
      departuresToday: 126,
      vipToday: 2,
      multiRoomToday: 2,
      lateCheckoutToday: 2,
      alerts: 4,
      confirmedNextDays: 37,
      decisionsRequired: 2,
      total: 128,
    });
    expect(center.alerts).toHaveLength(1);
    expect(center.alerts[0].message).toContain("HB-2026-08458");
    expect(center.reservations[0].guestName).toBe("María López");
  });
});