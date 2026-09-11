import { NextResponse } from "next/server";

import { mockPaymentsListDto } from "@/data/mocks/handlers";
import type { PaymentListResponseDto } from "@/modules/payments";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const folioId = url.searchParams.get("folio_id");
  const status = url.searchParams.get("status");

  let filtered = mockPaymentsListDto;
  if (folioId) {
    filtered = filtered.filter((p) => p.folio_id === folioId);
  }
  if (status) {
    filtered = filtered.filter((p) => p.status === status);
  }

  const response: PaymentListResponseDto = {
    payments: filtered,
    total_count: filtered.length,
  };

  return NextResponse.json(response);
}
