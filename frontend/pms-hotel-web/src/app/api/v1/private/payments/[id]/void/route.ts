import { NextResponse } from "next/server";

import { mockPaymentsListDto } from "@/data/mocks/handlers";
import type { PaymentDto, VoidPaymentRequestDto } from "@/modules/payments";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  if (id === "error_payment") {
    return NextResponse.json({ error: "Void failed by server" }, { status: 500 });
  }

  const existingIndex = mockPaymentsListDto.findIndex((p) => p.payment_id === id);
  const existing = existingIndex !== -1 ? mockPaymentsListDto[existingIndex] : {
    payment_id: id,
    folio_id: "fol_guest_101",
    reservation_id: "res_01",
    stay_id: "stay_01",
    method: "CREDIT_CARD" as const,
    status: "AUTHORIZED" as const,
    currency: "USD",
    authorized_amount: "500.00",
    captured_amount: "0.00",
    refunded_amount: "0.00",
    provider_reference: "tx_mock_auth",
    last4: "4242",
    card_brand: "Visa",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    failure_reason: null,
    audit_trail: [],
  };

  const body = (await request.json()) as VoidPaymentRequestDto;

  if (body.reason === "error_trigger") {
    return NextResponse.json({ error: "Void failed by gateway" }, { status: 500 });
  }

  if (existing.status !== "AUTHORIZED" || Number(existing.captured_amount) > 0) {
    return NextResponse.json(
      { error: `Payment with status ${existing.status} and captured amount $${existing.captured_amount} is not eligible for void.` },
      { status: 400 },
    );
  }

  const updatedPayment: PaymentDto = {
    ...existing,
    status: "VOIDED",
    updated_at: new Date().toISOString(),
    audit_trail: [
      ...(existing.audit_trail || []),
      {
        audit_id: `aud_void_${Date.now()}`,
        action: "VOID",
        amount: existing.authorized_amount,
        currency: existing.currency,
        performed_by: "staff_frontdesk",
        performed_at: new Date().toISOString(),
        reason: body.reason,
        provider_reference: `tx_void_${Date.now()}`,
      },
    ],
  };

  if (existingIndex !== -1) {
    mockPaymentsListDto[existingIndex] = updatedPayment;
  } else {
    mockPaymentsListDto.unshift(updatedPayment);
  }

  return NextResponse.json(updatedPayment);
}
