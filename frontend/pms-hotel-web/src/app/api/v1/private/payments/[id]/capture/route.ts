import { NextResponse } from "next/server";

import { mockPaymentsListDto } from "@/data/mocks/handlers";
import type { CapturePaymentRequestDto, PaymentDto } from "@/modules/payments";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  if (id === "error_payment") {
    return NextResponse.json({ error: "Capture failed by server" }, { status: 500 });
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

  const body = (await request.json()) as CapturePaymentRequestDto;
  const captureAmountNum = Number(body.amount);

  if (body.reason === "error_trigger" || captureAmountNum === 9999) {
    return NextResponse.json({ error: "Capture failed by gateway" }, { status: 500 });
  }

  if (existing.status !== "AUTHORIZED" && existing.status !== "PARTIALLY_CAPTURED") {
    return NextResponse.json(
      { error: `Payment with status ${existing.status} cannot be captured.` },
      { status: 400 },
    );
  }

  const authorizedNum = Number(existing.authorized_amount);
  const currentlyCapturedNum = Number(existing.captured_amount);
  const remainingCapturable = Math.max(0, authorizedNum - currentlyCapturedNum);

  if (captureAmountNum > remainingCapturable) {
    return NextResponse.json(
      { error: `Cannot capture $${captureAmountNum}. Maximum capturable amount is $${remainingCapturable.toFixed(2)}.` },
      { status: 400 },
    );
  }

  const newCapturedTotal = currentlyCapturedNum + captureAmountNum;
  const newStatus = newCapturedTotal >= authorizedNum ? ("CAPTURED" as const) : ("PARTIALLY_CAPTURED" as const);

  const updatedPayment: PaymentDto = {
    ...existing,
    status: newStatus,
    captured_amount: newCapturedTotal.toFixed(2),
    updated_at: new Date().toISOString(),
    audit_trail: [
      ...(existing.audit_trail || []),
      {
        audit_id: `aud_cap_${Date.now()}`,
        action: "CAPTURE",
        amount: body.amount,
        currency: existing.currency,
        performed_by: "staff_frontdesk",
        performed_at: new Date().toISOString(),
        reason: body.reason ?? null,
        provider_reference: `tx_cap_${Date.now()}`,
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
