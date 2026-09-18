import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const propertyId = url.searchParams.get("propertyId") || "prop_boutique_01";
  const startDate = url.searchParams.get("startDate") || "2023-10-01";
  const endDate = url.searchParams.get("endDate") || "2023-10-07";

  if (propertyId === "error_property") {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  const mockResponse = {
    propertyId: propertyId,
    currency: "USD",
    summary: {
      occupancyPercent: 82.5,
      adr: 215.5,
      revPar: 177.78,
      pickup: 12,
      pace: 5.4,
      totalRoomsSold: 240,
      totalRoomsAvailable: 290,
      totalRevenue: 51720,
    },
    daily: [
      {
        date: startDate,
        occupancyPercent: 80,
        adr: 200,
        revPar: 160,
        pickup: 2,
        pace: 1.5,
        roomsSold: 40,
        roomsAvailable: 50,
        revenue: 8000,
      },
      {
        date: "2023-10-02",
        occupancyPercent: 85,
        adr: 220,
        revPar: 187,
        pickup: 5,
        pace: 2.1,
        roomsSold: 42,
        roomsAvailable: 50,
        revenue: 9240,
      },
      {
        date: "2023-10-03",
        occupancyPercent: 90,
        adr: 250,
        revPar: 225,
        pickup: 8,
        pace: 3.5,
        roomsSold: 45,
        roomsAvailable: 50,
        revenue: 11250,
      },
    ],
  };

  return NextResponse.json(mockResponse);
}
