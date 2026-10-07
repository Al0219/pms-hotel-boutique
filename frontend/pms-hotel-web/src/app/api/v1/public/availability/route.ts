import { NextResponse } from "next/server";
import { getPublicEnvironment } from "@/lib/env";
import { buildPublicAvailabilityMock } from "@/data/mocks/public-availability";
import { publicCatalogueFixture } from "@/data/mocks/public-catalogue";
import { backendGuestRequest } from '@/lib/bff/guest-auth';

import {
  mockAvailabilityEmptyDto,
} from "@/data/mocks/handlers";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!getPublicEnvironment().useMockApi) {
    const headers = { 'cache-control': 'no-store' };
    const query = new URLSearchParams();
    for (const name of ['propertyId', 'arrival', 'departure', 'rooms']) {
      const value = url.searchParams.get(name);
      if (value !== null) query.set(name, value);
    }
    try {
      const upstream = await backendGuestRequest(`/api/v1/public/availability?${query}`, {
        method: 'GET', headers: { accept: 'application/json' }, signal: request.signal,
      });
      if (!upstream.ok) {
        const status = [400, 404, 500, 503].includes(upstream.status) ? upstream.status : 503;
        return NextResponse.json({ error: 'Public availability is unavailable' }, { status, headers });
      }
      const data = await upstream.json();
      // Whitelist this public contract; never forward unrelated upstream fields.
      return NextResponse.json({ propertyId: data.propertyId, arrival: data.arrival, departure: data.departure,
        currency: data.currency, offers: data.offers.map((offer: Record<string, unknown>) => ({
          roomTypeId: offer.roomTypeId, roomTypeCode: offer.roomTypeCode, roomTypeName: offer.roomTypeName,
          ratePlanId: offer.ratePlanId, ratePlanCode: offer.ratePlanCode, availableUnits: offer.availableUnits,
          nightlyRateMinor: offer.nightlyRateMinor, totalMinor: offer.totalMinor,
        })),
      }, { headers });
    } catch {
      return NextResponse.json({ error: 'Public availability is unavailable' }, { status: 503, headers });
    }
  }
  const propertyId = url.searchParams.get("property_id");

  if (propertyId === "error_property") {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  const response = buildPublicAvailabilityMock(url.searchParams,
    propertyId === "empty_property" ? mockAvailabilityEmptyDto : publicCatalogueFixture);
  return response ? NextResponse.json(response) : NextResponse.json({ error: "Invalid search criteria" }, { status: 400 });
}
