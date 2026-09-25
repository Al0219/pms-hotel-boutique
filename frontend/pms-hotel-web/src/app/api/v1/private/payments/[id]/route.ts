import { NextResponse } from "next/server";

import { mockPaymentsListDto } from "@/data/mocks/handlers";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  if (id === "error_payment") {
    return NextResponse.json({ error: "Payment lookup failed" }, { status: 500 });
  }

  const found = mockPaymentsListDto.find((p) => p.payment_id === id);
  if (!found) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  return NextResponse.json(found);
}
