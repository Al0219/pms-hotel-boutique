/**
 * Fixtures dev-only para el flujo de Reservations (IMP-WEB-0301/0302/0303).
 * Los DTO respetan el PROVISIONAL API CONTRACT del módulo hasta su confirmación con Backend.
 * Solo se registran en el worker de navegador (`browser.ts`), nunca en el server de tests.
 */

import { http, HttpResponse } from "msw";

import type {
  CancellationApplyDto,
  CancellationPreviewDto,
} from "@/modules/reservations/dtos/reservation-cancellation.dto";
import type { NoShowApplyDto, NoShowPreviewDto } from "@/modules/reservations/dtos/reservation-no-show.dto";
import type { ReservationDetailDto } from "@/modules/reservations/dtos/reservation-detail.dto";
import type { ReservationCenterDto, ReservationListItemDto } from "@/modules/reservations/dtos/reservation-list.dto";

const RESERVATIONS_ENDPOINT = "http://pms.test/contract/reservations";

function reservationList(propertyId: string): ReservationListItemDto[] {
  return [
    {
      reservation_id: "HB-2026-08421",
      property_id: propertyId,
      guest_name: "María Fernández",
      source_label: "Viajes Maya",
      source_reference: "VM-88213",
      room_label: "203",
      stay_start: "2026-08-28",
      stay_end: "2026-08-31",
      nights: 3,
      adults: 2,
      room_count: 1,
      currency: "GTQ",
      total_amount: "3480",
      paid_amount: "1160",
      finance_state: "BALANCE",
      alert_text: "Garantía vence hoy 20:00",
      status: "CONFIRMED",
      status_detail: "Check-in 28 ago · 15:00",
    },
    {
      reservation_id: "HB-2026-08207",
      property_id: propertyId,
      guest_name: "Familia Ordóñez",
      source_label: "Web directa",
      source_reference: null,
      room_label: null,
      stay_start: "2026-09-02",
      stay_end: "2026-09-05",
      nights: 3,
      adults: 4,
      room_count: null,
      currency: "GTQ",
      total_amount: "4640",
      paid_amount: null,
      finance_state: "NO_CAPTURE",
      alert_text: "En cola desde 12 ago",
      status: "WAITLIST",
      status_detail: "Esperando disponibilidad",
    },
    {
      reservation_id: "HB-2026-08390",
      property_id: propertyId,
      guest_name: "Carlos Méndez",
      source_label: "Booking",
      source_reference: "BKG-5512099",
      room_label: "Deluxe King",
      stay_start: "2026-08-30",
      stay_end: "2026-09-01",
      nights: 2,
      adults: 1,
      room_count: 1,
      currency: "GTQ",
      total_amount: "2320",
      paid_amount: null,
      finance_state: "NO_CAPTURE",
      alert_text: "Garantía vence hoy 20:00",
      status: "PENDING",
      status_detail: "Check-in 30 ago · 15:00",
    },
    {
      reservation_id: "HB-2026-08112",
      property_id: propertyId,
      guest_name: "Ana Lucía Ríos",
      source_label: "Expedia",
      source_reference: "EXP-77410",
      room_label: "Estándar Doble",
      stay_start: "2026-08-27",
      stay_end: "2026-08-29",
      nights: 2,
      adults: 2,
      room_count: 1,
      currency: "GTQ",
      total_amount: "1880",
      paid_amount: "470",
      finance_state: "DEPOSIT",
      alert_text: "Decisión de no-show antes de 18:00",
      status: "NO_SHOW_PENDING",
      status_detail: "Sin llegada registrada",
    },
    {
      reservation_id: "HB-2026-08055",
      property_id: propertyId,
      guest_name: "Pedro Ixcamey",
      source_label: "Viajes Maya",
      source_reference: "VM-88190",
      room_label: "Suite Jardín",
      stay_start: "2026-08-18",
      stay_end: "2026-08-21",
      nights: 3,
      adults: 2,
      room_count: 1,
      currency: "GTQ",
      total_amount: "4200",
      paid_amount: "0",
      finance_state: "DEPOSIT",
      alert_text: null,
      status: "CANCELLED",
      status_detail: "Cancelada 15 ago",
    },
  ];
}

function reservationCenter(propertyId: string): ReservationCenterDto {
  return {
    summary: {
      arrivals_today: 6,
      departures_today: 4,
      vip_today: 1,
      multi_room_today: 2,
      late_checkout_today: 1,
      alerts: 3,
      confirmed_next_days: 12,
      decisions_required: 2,
      total: 5,
    },
    alerts: [
      {
        alert_id: "ALERT-NO-SHOW",
        kind: "NO_SHOW_PENDING",
        message: "HB-2026-08112 requiere decisión de no-show antes de 18:00.",
      },
      {
        alert_id: "ALERT-GUARANTEE",
        kind: "GUARANTEE_EXPIRING",
        message: "Garantía de HB-2026-08390 vence hoy 20:00.",
      },
      {
        alert_id: "ALERT-WAITLIST",
        kind: "WAITLIST_QUEUE",
        message: "HB-2026-08207 espera disponibilidad para el 2 sep.",
      },
    ],
    reservations: reservationList(propertyId),
  };
}

const reservationDetails: Record<string, ReservationDetailDto> = {
  "HB-2026-08421": {
    reservation_id: "HB-2026-08421",
    property_id: "GT-HB-01",
    status: "CONFIRMED",
    created_at: "2026-08-20",
    source: { label: "Viajes Maya", reference: "VM-88213" },
    policy_label: "Flexible 48h · Viajes Maya",
    guest: {
      primary_name: "María Fernández",
      phone: "+502 5555 0142",
      adults: 2,
      children: null,
    },
    stays: [
      {
        stay_id: "STAY-2026-08421-A",
        room_id: "ROOM-203",
        room_label: "203",
        room_type: "Deluxe King",
        check_in: "2026-08-28",
        check_out: "2026-08-31",
        nights: 3,
        travel_state: "RESERVED",
      },
    ],
    notes: "Llegada tardía · cuna adicional",
    currency: "GTQ",
    total_amount: "3480",
    paid_amount: "1160",
    finance_state: "BALANCE",
    rate_per_night: "1160",
    lines: [{ label: "Habitación · 3 noches", amount: "3480" }],
  },
  "HB-2026-08112": {
    reservation_id: "HB-2026-08112",
    property_id: "GT-HB-01",
    status: "NO_SHOW_PENDING",
    created_at: "2026-08-25",
    source: { label: "Expedia", reference: "EXP-77410" },
    policy_label: "No-show: cargo de una noche + impuestos",
    guest: {
      primary_name: "Ana Lucía Ríos",
      phone: "+502 5555 0177",
      adults: 2,
      children: null,
    },
    stays: [
      {
        stay_id: "STAY-2026-08112-A",
        room_id: "ROOM-101",
        room_label: "101",
        room_type: "Estándar Doble",
        check_in: "2026-08-27",
        check_out: "2026-08-29",
        nights: 2,
        travel_state: "RESERVED",
      },
    ],
    notes: null,
    currency: "GTQ",
    total_amount: "1880",
    paid_amount: "470",
    finance_state: "DEPOSIT",
    rate_per_night: "940",
    lines: [{ label: "Habitación · 2 noches", amount: "1880" }],
  },
  "HB-2026-08055": {
    reservation_id: "HB-2026-08055",
    property_id: "GT-HB-01",
    status: "CANCELLED",
    created_at: "2026-08-10",
    source: { label: "Viajes Maya", reference: "VM-88190" },
    policy_label: "Flexible 48h · Viajes Maya",
    guest: {
      primary_name: "Pedro Ixcamey",
      phone: "+502 5555 0198",
      adults: 2,
      children: null,
    },
    stays: [
      {
        stay_id: "STAY-2026-08055-A",
        room_id: "ROOM-310",
        room_label: "310",
        room_type: "Suite Jardín",
        check_in: "2026-08-18",
        check_out: "2026-08-21",
        nights: 3,
        travel_state: "CANCELLED",
      },
    ],
    notes: null,
    currency: "GTQ",
    total_amount: "4200",
    paid_amount: "0",
    finance_state: "DEPOSIT",
    rate_per_night: "1400",
    lines: [{ label: "Habitación · 3 noches", amount: "4200" }],
  },
};

const cancellationPreviews: Record<string, CancellationPreviewDto> = {
  "HB-2026-08421": {
    reservation_id: "HB-2026-08421",
    policy_summary: "Flexible 48h · Viajes Maya: hasta 48h antes cancelación gratuita.",
    cutoff_at: "2026-08-26T03:00:00.000Z",
    penalty_amount: "1160",
    refund_amount: "2320",
    release_note: "Deluxe King 203 · 28–31 ago.",
    can_cancel: true,
    reason: null,
  },
  "HB-2026-08055": {
    reservation_id: "HB-2026-08055",
    policy_summary: "Flexible 48h · Viajes Maya: hasta 48h antes cancelación gratuita.",
    cutoff_at: null,
    penalty_amount: "0",
    refund_amount: "0",
    release_note: null,
    can_cancel: false,
    reason: "La reserva ya está cancelada.",
  },
};

const noShowPreviews: Record<string, NoShowPreviewDto> = {
  "HB-2026-08112": {
    reservation_id: "HB-2026-08112",
    policy_summary: "No-show: cargo de una noche + impuestos.",
    cutoff_at: "2026-08-27T18:00:00.000Z",
    allowed_charge: "470",
    release_note: "Estándar Doble 101 · 27–29 ago.",
    can_mark_no_show: true,
    reason: null,
  },
  "HB-2026-08421": {
    reservation_id: "HB-2026-08421",
    policy_summary: "No-show: cargo de una noche + impuestos.",
    cutoff_at: null,
    allowed_charge: "0",
    release_note: null,
    can_mark_no_show: false,
    reason: "La reserva no está pendiente de no-show.",
  },
};

export const reservationHandlers = [
  http.get(RESERVATIONS_ENDPOINT, ({ request }) => {
    const propertyId = new URL(request.url).searchParams.get("propertyId") ?? "GT-HB-01";
    return HttpResponse.json(reservationCenter(propertyId));
  }),
  http.get(`${RESERVATIONS_ENDPOINT}/:reservationId`, ({ params }) => {
    const detail = reservationDetails[String(params.reservationId)];

    if (!detail) {
      return HttpResponse.text(null, { status: 404 });
    }

    return HttpResponse.json(detail);
  }),
  http.get(`${RESERVATIONS_ENDPOINT}/:reservationId/cancellation-preview`, ({ params }) => {
    const preview = cancellationPreviews[String(params.reservationId)];

    if (!preview) {
      return HttpResponse.text(null, { status: 404 });
    }

    return HttpResponse.json(preview);
  }),
  http.post(`${RESERVATIONS_ENDPOINT}/:reservationId/cancellation`, async ({ params, request }) => {
    const body = (await request.json()) as { reason?: string };
    const reservationId = String(params.reservationId);

    const result: CancellationApplyDto = {
      reservation_id: reservationId,
      status: "CANCELLED",
      cancelled_at: new Date().toISOString(),
      penalty_amount: "1160",
      refund_amount: "2320",
      message: body.reason
        ? `Penalty Charge Q1,160 · Refund Q2,320 · ATS +1/noche · Motivo: ${body.reason}`
        : "Penalty Charge Q1,160 · Refund Q2,320 · ATS +1/noche",
    };

    return HttpResponse.json(result);
  }),
  http.get(`${RESERVATIONS_ENDPOINT}/:reservationId/no-show-preview`, ({ params }) => {
    const preview = noShowPreviews[String(params.reservationId)];

    if (!preview) {
      return HttpResponse.text(null, { status: 404 });
    }

    return HttpResponse.json(preview);
  }),
  http.post(`${RESERVATIONS_ENDPOINT}/:reservationId/no-show`, async ({ params }) => {
    const reservationId = String(params.reservationId);

    const result: NoShowApplyDto = {
      reservation_id: reservationId,
      status: "NO_SHOW",
      marked_at: new Date().toISOString(),
      allowed_charge: "470",
      message: "No-show: cargo Q470 · ATS +1/noche · AuditTrail RESERVATION_NO_SHOW",
    };

    return HttpResponse.json(result);
  }),
];
