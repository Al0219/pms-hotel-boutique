import { NextResponse } from "next/server";

import {
  mockAvailabilityEmptyDto,
  mockAvailabilitySuccessDto,
} from "@/data/mocks/handlers";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const propertyId = url.searchParams.get("property_id");

  if (propertyId === "error_property") {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  if (propertyId === "empty_property") {
    return NextResponse.json(mockAvailabilityEmptyDto);
  }

  return NextResponse.json(mockAvailabilitySuccessDto);
}
