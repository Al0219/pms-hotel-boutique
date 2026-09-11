import { http, HttpResponse } from "msw";

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
];
