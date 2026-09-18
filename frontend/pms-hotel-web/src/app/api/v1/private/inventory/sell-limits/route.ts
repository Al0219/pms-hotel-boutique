import { NextResponse } from "next/server";

import { mockSellLimitsListDto } from "@/data/mocks/handlers";
import type {
  SellLimitDto,
  SellLimitListResponseDto,
  UpdateSellLimitRequestDto,
} from "@/modules/inventory";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const propertyId = url.searchParams.get("property_id");
  const startDate = url.searchParams.get("start_date");
  const endDate = url.searchParams.get("end_date");
  const roomTypeId = url.searchParams.get("room_type_id");

  let filtered = [...mockSellLimitsListDto];
  if (propertyId) {
    filtered = filtered.filter((i) => i.property_id === propertyId);
  }
  if (roomTypeId) {
    filtered = filtered.filter((i) => i.room_type_id === roomTypeId);
  }
  if (startDate) {
    filtered = filtered.filter((i) => i.date >= startDate);
  }
  if (endDate) {
    filtered = filtered.filter((i) => i.date <= endDate);
  }

  const response: SellLimitListResponseDto = {
    items: filtered,
    total_count: filtered.length,
  };

  return NextResponse.json(response);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UpdateSellLimitRequestDto;
    if (!body || !body.property_id || !body.room_type_id || !body.date) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    const existingIndex = mockSellLimitsListDto.findIndex(
      (i) =>
        i.property_id === body.property_id &&
        i.room_type_id === body.room_type_id &&
        i.date === body.date,
    );

    let updatedItem: SellLimitDto;
    if (existingIndex >= 0) {
      const existing = mockSellLimitsListDto[existingIndex];
      const base = Math.max(
        0,
        existing.physical_rooms_count -
          existing.ooo_rooms_count -
          existing.oos_rooms_count -
          existing.sold_rooms_count,
      );
      const withOverbooking = Math.max(0, base + body.overbooking_limit);
      const finalAts =
        body.sell_limit !== null && body.sell_limit >= 0
          ? Math.min(body.sell_limit, withOverbooking)
          : withOverbooking;

      updatedItem = {
        ...existing,
        overbooking_limit: body.overbooking_limit,
        sell_limit: body.sell_limit,
        calculated_ats: finalAts,
        updated_at: new Date().toISOString(),
      };
      mockSellLimitsListDto[existingIndex] = updatedItem;
    } else {
      const base = 5;
      const withOverbooking = Math.max(0, base + body.overbooking_limit);
      const finalAts =
        body.sell_limit !== null && body.sell_limit >= 0
          ? Math.min(body.sell_limit, withOverbooking)
          : withOverbooking;

      updatedItem = {
        limit_id: `lim_gen_${Date.now()}`,
        property_id: body.property_id,
        room_type_id: body.room_type_id,
        room_type_name: body.room_type_id,
        date: body.date,
        physical_rooms_count: 5,
        ooo_rooms_count: 0,
        oos_rooms_count: 0,
        sold_rooms_count: 0,
        overbooking_limit: body.overbooking_limit,
        sell_limit: body.sell_limit,
        calculated_ats: finalAts,
        updated_at: new Date().toISOString(),
      };
      mockSellLimitsListDto.push(updatedItem);
    }

    return NextResponse.json(updatedItem);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
