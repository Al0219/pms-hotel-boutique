import { NextResponse } from "next/server";

import { mockPaymentsListDto } from "@/data/mocks/handlers";
import type { AuthorizePaymentRequestDto, PaymentDto } from "@/modules/payments";

export async function POST(request: Request) {
  const body = (await request.json()) as AuthorizePaymentRequestDto;

  if (body.card_token === "tok_error" || body.amount === "9999.00") {
    return NextResponse.json({ error: "Authorization failed by gateway" }, { status: 500 });
  }

  if (body.card_token === "tok_declined") {
    const declinedPayment: PaymentDto = {
      payment_id: `pay_auth_${Date.now()}`,
      folio_id: body.folio_id,
      reservation_id: body.reservation_id ?? null,
      stay_id: body.stay_id ?? null,
      method: body.method,
      status: "DECLINED",
      currency: body.currency,
      authorized_amount: "0.00",
      captured_amount: "0.00",
      refunded_amount: "0.00",
      provider_reference: null,
      last4: body.last4 ?? "0000",
      card_brand: body.card_brand ?? "Visa",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      failure_reason: "Fondos insuficientes o tarjeta rechazada por el emisor.",
      audit_trail: [
        {
          audit_id: `aud_${Date.now()}`,
          action: "FAIL",
          amount: body.amount,
          currency: body.currency,
          performed_by: "gateway_processor",
          performed_at: new Date().toISOString(),
          reason: "Fondos insuficientes o tarjeta rechazada por el emisor.",
        },
      ],
    };
    return NextResponse.json(declinedPayment);
  }

  const newPayment: PaymentDto = {
    payment_id: `pay_auth_${Date.now()}`,
    folio_id: body.folio_id,
    reservation_id: body.reservation_id ?? null,
    stay_id: body.stay_id ?? null,
    method: body.method,
    status: "AUTHORIZED",
    currency: body.currency,
    authorized_amount: body.amount,
    captured_amount: "0.00",
    refunded_amount: "0.00",
    provider_reference: `tx_auth_${Date.now()}`,
    last4: body.last4 ?? "4242",
    card_brand: body.card_brand ?? "Visa",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    failure_reason: null,
    audit_trail: [
      {
        audit_id: `aud_${Date.now()}`,
        action: "AUTHORIZE",
        amount: body.amount,
        currency: body.currency,
        performed_by: "staff_frontdesk",
        performed_at: new Date().toISOString(),
        provider_reference: `tx_auth_${Date.now()}`,
      },
    ],
  };

  mockPaymentsListDto.unshift(newPayment);
  return NextResponse.json(newPayment);
}
