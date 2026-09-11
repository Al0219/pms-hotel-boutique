import { NextResponse } from "next/server";

import { mockRatePlansListDto } from "@/data/mocks/handlers";
import type { RatePlanListResponseDto } from "@/modules/rates";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const propertyId = url.searchParams.get("property_id");
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("search")?.toLowerCase();

  let filtered = mockRatePlansListDto;
  if (propertyId) {
    filtered = filtered.filter((rp) => rp.property_id === propertyId);
  }
  if (status) {
    filtered = filtered.filter((rp) => rp.status === status);
  }
  if (search) {
    filtered = filtered.filter(
      (rp) =>
        rp.name.toLowerCase().includes(search) ||
        rp.code.toLowerCase().includes(search) ||
        (rp.description && rp.description.toLowerCase().includes(search)),
    );
  }

  const response: RatePlanListResponseDto = {
    rate_plans: filtered,
    total_count: filtered.length,
  };

  return NextResponse.json(response);
}
