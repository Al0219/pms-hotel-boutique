import { NextResponse } from "next/server";

import {
  mockRateRestrictionsListDto,
} from "@/data/mocks/handlers";
import type {
  BatchUpdateRateRestrictionsPayloadDto,
  RateRestrictionBatchResultDto,
  RateRestrictionDto,
} from "@/modules/rates";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const propertyId = url.searchParams.get("property_id");
  const startDate = url.searchParams.get("start_date");
  const endDate = url.searchParams.get("end_date");
  const ratePlanId = url.searchParams.get("rate_plan_id");
  const roomTypeId = url.searchParams.get("room_type_id");

  let filtered = [...mockRateRestrictionsListDto];
  if (propertyId) {
    filtered = filtered.filter((r) => r.property_id === propertyId);
  }
  if (ratePlanId) {
    filtered = filtered.filter((r) => r.rate_plan_id === ratePlanId);
  }
  if (roomTypeId) {
    filtered = filtered.filter((r) => r.room_type_id === roomTypeId);
  }
  if (startDate) {
    filtered = filtered.filter((r) => r.date >= startDate);
  }
  if (endDate) {
    filtered = filtered.filter((r) => r.date <= endDate);
  }

  return NextResponse.json({ restrictions: filtered });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BatchUpdateRateRestrictionsPayloadDto;
    if (!body || !body.property_id || !Array.isArray(body.restrictions)) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    const updated: RateRestrictionDto[] = [];
    for (const item of body.restrictions) {
      const existingIndex = mockRateRestrictionsListDto.findIndex(
        (r) =>
          r.property_id === body.property_id &&
          r.rate_plan_id === item.rate_plan_id &&
          r.room_type_id === item.room_type_id &&
          r.date === item.date,
      );

      if (existingIndex >= 0) {
        const existing = mockRateRestrictionsListDto[existingIndex];
        const updatedItem: RateRestrictionDto = {
          ...existing,
          closed_to_arrival:
            item.closed_to_arrival !== undefined ? item.closed_to_arrival : existing.closed_to_arrival,
          closed_to_departure:
            item.closed_to_departure !== undefined ? item.closed_to_departure : existing.closed_to_departure,
          min_length_of_stay:
            item.min_length_of_stay !== undefined ? item.min_length_of_stay : existing.min_length_of_stay,
          stop_sell: item.stop_sell !== undefined ? item.stop_sell : existing.stop_sell,
          updated_at: new Date().toISOString(),
        };
        mockRateRestrictionsListDto[existingIndex] = updatedItem;
        updated.push(updatedItem);
      } else {
        const newItem: RateRestrictionDto = {
          restriction_id: `res_gen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          property_id: body.property_id,
          rate_plan_id: item.rate_plan_id,
          room_type_id: item.room_type_id,
          date: item.date,
          closed_to_arrival: item.closed_to_arrival ?? false,
          closed_to_departure: item.closed_to_departure ?? false,
          min_length_of_stay: item.min_length_of_stay ?? 1,
          stop_sell: item.stop_sell ?? false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        mockRateRestrictionsListDto.push(newItem);
        updated.push(newItem);
      }
    }

    const result: RateRestrictionBatchResultDto = {
      success: true,
      updated_count: updated.length,
      restrictions: updated,
    };

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno del servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
