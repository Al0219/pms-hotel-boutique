import { NextResponse } from "next/server";

import { mockPaymentsListDto } from "@/data/mocks/handlers";
import type { PaymentDto, RefundPaymentRequestDto } from "@/modules/payments";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  if (id === "error_payment") {
    return NextResponse.json({ error: "Refund failed by server" }, { status: 500 });
  }

  const existingIndex = mockPaymentsListDto.findIndex((p) => p.payment_id === id);
  const existing = existingIndex !== -1 ? mockPaymentsListDto[existingIndex] : {
    payment_id: id,
    folio_id: "fol_guest_101",
    reservation_id: "res_01",
    stay_id: "stay_01",
    method: "CREDIT_CARD" as const,
    status: "CAPTURED" as const,
    currency: "USD",
    authorized_amount: "500.00",
    captured_amount: "500.00",
    refunded_amount: "0.00",
    provider_reference: "tx_mock_cap",
    last4: "4242",
    card_brand: "Visa",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    failure_reason: null,
    audit_trail: [],
  };

  const body = (await request.json()) as RefundPaymentRequestDto;
  const refundAmountNum = Number(body.amount);

  if (body.reason === "error_trigger" || refundAmountNum === 9999) {
    return NextResponse.json({ error: "Refund failed by gateway" }, { status: 500 });
  }

  const capturedNum = Number(existing.captured_amount);
  const currentlyRefundedNum = Number(existing.refunded_amount);
  const remainingRefundable = Math.max(0, capturedNum - currentlyRefundedNum);

  if (refundAmountNum <= 0 || refundAmountNum > remainingRefundable) {
    return NextResponse.json(
      { error: `Cannot refund $${refundAmountNum}. Maximum refundable amount is $${remainingRefundable.toFixed(2)}.` },
      { status: 400 },
    );
  }

  const newRefundedTotal = currentlyRefundedNum + refundAmountNum;
  const newStatus = newRefundedTotal >= capturedNum ? ("REFUNDED" as const) : ("PARTIALLY_REFUNDED" as const);

  const updatedPayment: PaymentDto = {
    ...existing,
    status: newStatus,
    refunded_amount: newRefundedTotal.toFixed(2),
    updated_at: new Date().toISOString(),
    audit_trail: [
      ...(existing.audit_trail || []),
      {
        audit_id: `aud_ref_${Date.now()}`,
        action: "REFUND",
        amount: body.amount,
        currency: existing.currency,
        performed_by: "staff_frontdesk",
        performed_at: new Date().toISOString(),
        reason: body.reason,
        provider_reference: `tx_ref_${Date.now()}`,
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
