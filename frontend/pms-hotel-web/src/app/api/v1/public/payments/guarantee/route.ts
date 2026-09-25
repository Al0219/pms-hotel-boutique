import { NextResponse } from "next/server";

import type {
  PaymentGuaranteeRequestDto,
  PaymentGuaranteeResponseDto,
} from "@/modules/payments";

export async function POST(request: Request) {
  const body = (await request.json()) as PaymentGuaranteeRequestDto;

  if (body.card_token === "tok_error") {
    return NextResponse.json({ error: "Gateway Timeout" }, { status: 500 });
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
    return NextResponse.json(declinedResponse);
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

  return NextResponse.json(successResponse);
}
