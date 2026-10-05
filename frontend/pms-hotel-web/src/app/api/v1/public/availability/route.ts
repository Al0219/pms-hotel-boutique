import { NextResponse } from "next/server";
import { getPublicEnvironment } from "@/lib/env";
import { buildPublicAvailabilityMock } from "@/data/mocks/public-availability";

import {
  mockAvailabilityEmptyDto,
  mockAvailabilitySuccessDto,
} from "@/data/mocks/handlers";

export async function GET(request: Request) {
  // The Guest HTTP contract is provisional. Never return demo inventory as live data.
  if (!getPublicEnvironment().useMockApi) {
    return NextResponse.json({ error: "Public availability is not connected" }, { status: 503 });
  }
  const url = new URL(request.url);
  const propertyId = url.searchParams.get("property_id");

  if (propertyId === "error_property") {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  const response = buildPublicAvailabilityMock(url.searchParams,
    propertyId === "empty_property" ? mockAvailabilityEmptyDto : mockAvailabilitySuccessDto);
  return response ? NextResponse.json(response) : NextResponse.json({ error: "Invalid search criteria" }, { status: 400 });
}
