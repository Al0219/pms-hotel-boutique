import { http, HttpResponse } from "msw";

import type {
  FolioDto,
  SplitChargeRequestDto,
  SplitChargeResultDto,
} from "@/modules/folio/dtos/folio.dto";
import type {
  PaymentGuaranteeRequestDto,
  PaymentGuaranteeResponseDto,
} from "@/modules/payments/dtos/payment.dto";

export const mockAvailabilitySuccessDto = {
  property_id: "prop_boutique_01",
  check_in_date: "2026-10-01",
  check_out_date: "2026-10-04",
  total_nights: 3,
  available_room_types: [
    {
      room_type_id: "rt_deluxe_king",
      name: "Deluxe King Suite",
      code: "DLX-KNG",
      description: "Habitación espaciosa con cama King size, vista al jardín y terraza privada.",
      max_occupancy: 2,
      available_rooms_count: 5,
      rate_plans: [
        {
          rate_plan_id: "rp_flexible",
          rate_plan_name: "Tarifa Flexible",
          description: "Cancelación gratuita hasta 48 horas antes de la llegada.",
          base_nightly_rate: "250.00",
          total_amount: "750.00",
          currency: "USD",
          cancellation_policy: "Cancelación gratuita hasta 48h antes del check-in.",
          meals_included: "Desayuno a la carta incluido",
        },
        {
          rate_plan_id: "rp_non_refundable",
          rate_plan_name: "Tarifa No Reembolsable",
          description: "15% de descuento por pago anticipado.",
          base_nightly_rate: "212.50",
          total_amount: "637.50",
          currency: "USD",
          cancellation_policy: "No reembolsable en caso de cancelación o no-show.",
          meals_included: null,
        },
      ],
      images: ["/images/rooms/deluxe-king-1.webp", "/images/rooms/deluxe-king-2.webp"],
    },
    {
      room_type_id: "rt_master_suite",
      name: "Master Suite Presidencial",
      code: "MST-STE",
      description: "Suite de lujo con sala de estar, jacuzzi y balcón panorámico.",
      max_occupancy: 4,
      available_rooms_count: 2,
      rate_plans: [
        {
          rate_plan_id: "rp_flexible_vip",
          rate_plan_name: "Tarifa Flexible VIP",
          description: "Incluye todos los servicios boutique y traslado al aeropuerto.",
          base_nightly_rate: "480.00",
          total_amount: "1440.00",
          currency: "USD",
          cancellation_policy: "Cancelación gratuita hasta 24h antes.",
          meals_included: "Desayuno gourmet y degustación de vinos",
        },
      ],
      images: ["/images/rooms/master-suite-1.webp"],
    },
  ],
};

export const mockAvailabilityEmptyDto = {
  property_id: "prop_boutique_01",
  check_in_date: "2026-10-01",
  check_out_date: "2026-10-04",
  total_nights: 3,
  available_room_types: [],
};

export const mockGuestFolioDto: FolioDto = {
  folio_id: "fol_guest_101",
  folio_number: "FOL-2026-0089",
  reservation_id: "res_demo_101",
  stay_id: "stay_demo_101_a",
  type: "GUEST",
  status: "OPEN",
  holder_name: "Carlos Morales",
  room_number: "Suite 204",
  currency: "USD",
  total_charges: "980.00",
  total_payments: "500.00",
  balance: "480.00",
  charges: [
    {
      charge_id: "chg_01",
      category: "ROOM_NIGHT",
      description: "Noche 1 - Suite King (01/10/2026)",
      amount: "250.00",
      currency: "USD",
      posted_at: "2026-10-01T15:00:00.000Z",
      posted_by: "system_night_audit",
    },
    {
      charge_id: "chg_02",
      category: "ROOM_NIGHT",
      description: "Noche 2 - Suite King (02/10/2026)",
      amount: "250.00",
      currency: "USD",
      posted_at: "2026-10-02T15:00:00.000Z",
      posted_by: "system_night_audit",
    },
    {
      charge_id: "chg_03",
      category: "ROOM_NIGHT",
      description: "Noche 3 - Suite King (03/10/2026)",
      amount: "250.00",
      currency: "USD",
      posted_at: "2026-10-03T15:00:00.000Z",
      posted_by: "system_night_audit",
    },
    {
      charge_id: "chg_04",
      category: "RESTAURANT",
      description: "Cena Restaurante La Terraza",
      amount: "130.00",
      currency: "USD",
      posted_at: "2026-10-02T21:30:00.000Z",
      posted_by: "pos_restaurant",
    },
    {
      charge_id: "chg_05",
      category: "SPA",
      description: "Masaje Relajante Spa Boutique",
      amount: "100.00",
      currency: "USD",
      posted_at: "2026-10-03T11:00:00.000Z",
      posted_by: "staff_spa",
    },
  ],
  payments: [
    {
      payment_entry_id: "pay_entry_01",
      payment_id: "pay_online_guarantee_101",
      amount: "500.00",
      currency: "USD",
      method: "CREDIT_CARD",
      paid_at: "2026-10-01T14:30:00.000Z",
      reference: "ref_stripe_8871",
    },
  ],
  routing_rules: [
    {
      rule_id: "rule_01",
      source_folio_id: "fol_guest_101",
      target_folio_id: "fol_company_202",
      category: "ROOM_NIGHT",
      percentage: 100,
      created_at: "2026-10-01T14:00:00.000Z",
    },
  ],
  created_at: "2026-10-01T14:00:00.000Z",
};

function handleAvailabilityRequest({ request }: { request: Request }) {
  const url = new URL(request.url);
  const propertyId = url.searchParams.get("property_id");

  if (propertyId === "error_property") {
    return HttpResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  if (propertyId === "empty_property") {
    return HttpResponse.json(mockAvailabilityEmptyDto);
  }

  return HttpResponse.json(mockAvailabilitySuccessDto);
}

async function handlePaymentGuaranteeRequest({ request }: { request: Request }) {
  const body = (await request.json()) as PaymentGuaranteeRequestDto;

  if (body.card_token === "tok_error") {
    return HttpResponse.json({ error: "Gateway Timeout" }, { status: 500 });
  }

  if (body.card_token === "tok_declined") {
    const declinedResponse: PaymentGuaranteeResponseDto = {
      payment_id: "pay_declined_999",
      status: "DECLINED",
      amount: body.amount,
      currency: body.currency,
      provider_reference: null,
      last4: body.last4 ?? "0002",
      card_brand: body.card_brand ?? "Visa",
      created_at: new Date().toISOString(),
      failure_reason: "Fondos insuficientes o tarjeta rechazada por el emisor.",
    };
    return HttpResponse.json(declinedResponse);
  }

  const successResponse: PaymentGuaranteeResponseDto = {
    payment_id: `pay_${Date.now()}`,
    status: body.payment_method === "PAY_AT_HOTEL" ? "PENDING_GUARANTEE" : "AUTHORIZED",
    amount: body.amount,
    currency: body.currency,
    provider_reference: `ref_stripe_${Date.now()}`,
    last4: body.last4 ?? "4242",
    card_brand: body.card_brand ?? "Visa",
    created_at: new Date().toISOString(),
    failure_reason: null,
  };

  return HttpResponse.json(successResponse);
}

function handleGetFolioById({ params }: { params: Record<string, string | readonly string[] | undefined> }) {
  const folioId = params.id;
  if (folioId === "error_folio") {
    return HttpResponse.json({ error: "Folio Internal Error" }, { status: 500 });
  }
  if (folioId === "missing_folio") {
    return HttpResponse.json({ error: "Folio Not Found" }, { status: 404 });
  }
  return HttpResponse.json({
    ...mockGuestFolioDto,
    folio_id: typeof folioId === "string" ? folioId : mockGuestFolioDto.folio_id,
  });
}

async function handleSplitChargeRequest({ params, request }: { params: Record<string, string | readonly string[] | undefined>; request: Request }) {
  const folioId = typeof params.id === "string" ? params.id : "fol_guest_101";
  const body = (await request.json()) as SplitChargeRequestDto;

  if (body.charge_id === "error_charge") {
    return HttpResponse.json({ error: "Split Failed" }, { status: 500 });
  }

  const createdCharges = body.portions.map((p, idx) => ({
    charge_id: `chg_split_${Date.now()}_${idx + 1}`,
    category: "RESTAURANT" as const,
    description: p.description || `Porción dividida ${idx + 1}`,
    amount: p.amount,
    currency: "USD",
    posted_at: new Date().toISOString(),
    posted_by: "staff_frontdesk",
    original_split_charge_id: body.charge_id,
  }));

  const remainingCharges = mockGuestFolioDto.charges.filter((c) => c.charge_id !== body.charge_id);
  const updatedCharges = [...remainingCharges, createdCharges[0]];

  const totalChargesNum = updatedCharges.reduce((sum, c) => sum + Number(c.amount), 0);
  const totalPaymentsNum = mockGuestFolioDto.payments.reduce((sum, p) => sum + Number(p.amount), 0);

  const updatedSourceFolio: FolioDto = {
    ...mockGuestFolioDto,
    folio_id: folioId,
    charges: updatedCharges,
    total_charges: totalChargesNum.toFixed(2),
    balance: (totalChargesNum - totalPaymentsNum).toFixed(2),
  };

  const response: SplitChargeResultDto = {
    original_charge_id: body.charge_id,
    source_folio_id: folioId,
    created_charges: createdCharges,
    updated_source_folio: updatedSourceFolio,
  };

  return HttpResponse.json(response);
}

export const handlers = [
  http.get("http://pms.test/__msw/health", () => HttpResponse.json({ status: "ok" })),
  http.get("http://pms.test/__msw/missing", () => HttpResponse.text(null, { status: 404 })),
  http.get("http://pms.test/guest-accounts/:accountId", ({ params }) =>
    HttpResponse.json({
      account_id: params.accountId,
      email: "guest@example.com",
      external_identities: [],
    }),
  ),
  http.get("http://pms.test/api/v1/public/availability", handleAvailabilityRequest),
  http.get("/api/v1/public/availability", handleAvailabilityRequest),
  http.post("http://pms.test/api/v1/public/payments/guarantee", handlePaymentGuaranteeRequest),
  http.post("/api/v1/public/payments/guarantee", handlePaymentGuaranteeRequest),
  http.get("http://pms.test/api/v1/private/folios/:id", handleGetFolioById),
  http.get("/api/v1/private/folios/:id", handleGetFolioById),
  http.post("http://pms.test/api/v1/private/folios/:id/split-charge", handleSplitChargeRequest),
  http.post("/api/v1/private/folios/:id/split-charge", handleSplitChargeRequest),
];
