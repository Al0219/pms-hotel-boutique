import { httpRequest } from "@/lib/http";

import type {
  SellLimitListQueryDto,
  SellLimitListResponseDto,
  UpdateSellLimitRequestDto,
  SellLimitDto,
} from "../dtos/sell-limit.dto";
import type { SellLimit, UpdateSellLimitParams } from "../model/sell-limit";
import {
  toDomainSellLimit,
  toDtoUpdateSellLimit,
} from "../mappers/sell-limit.mapper";

export async function fetchSellLimitsDto(
  query: SellLimitListQueryDto,
  signal?: AbortSignal
): Promise<SellLimitListResponseDto> {
  const params = new URLSearchParams();
  params.set("property_id", query.property_id);
  if (query.start_date) params.set("start_date", query.start_date);
  if (query.end_date) params.set("end_date", query.end_date);
  if (query.room_type_id) params.set("room_type_id", query.room_type_id);

  const queryString = params.toString();
  const path = queryString
    ? `/api/v1/private/inventory/sell-limits?${queryString}`
    : "/api/v1/private/inventory/sell-limits";

  return httpRequest<SellLimitListResponseDto>({
    path,
    method: "GET",
    signal,
  });
}

export async function updateSellLimitDto(
  payload: UpdateSellLimitRequestDto,
  signal?: AbortSignal
): Promise<SellLimitDto> {
  return httpRequest<SellLimitDto>({
    path: "/api/v1/private/inventory/sell-limits",
    method: "POST",
    json: payload,
    signal,
  });
}

export async function fetchSellLimits(
  propertyId: string,
  startDate?: string,
  endDate?: string,
  roomTypeId?: string,
  signal?: AbortSignal
): Promise<SellLimit[]> {
  const response = await fetchSellLimitsDto(
    {
      property_id: propertyId,
      start_date: startDate,
      end_date: endDate,
      room_type_id: roomTypeId,
    },
    signal
  );
  return response.items.map(toDomainSellLimit);
}

export async function updateSellLimit(
  params: UpdateSellLimitParams,
  signal?: AbortSignal
): Promise<SellLimit> {
  const dto = toDtoUpdateSellLimit(params);
  const result = await updateSellLimitDto(dto, signal);
  return toDomainSellLimit(result);
}
