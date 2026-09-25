import { NextResponse } from "next/server";

import { mockRatePlansListDto } from "@/data/mocks/handlers";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  if (id === "error_rate_plan") {
    return NextResponse.json({ error: "RatePlan Internal Error" }, { status: 500 });
  }

  const found = mockRatePlansListDto.find((rp) => rp.rate_plan_id === id);
  if (!found) {
    return NextResponse.json({ error: "RatePlan Not Found" }, { status: 404 });
  }

  return NextResponse.json(found);
}
