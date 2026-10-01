import { httpRequest } from "@/lib/http";

import type {
  SellLimitListQueryDto,
  SellLimitListResponseDto,
  UpdateSellLimitRequestDto,
  SellLimitDto,
} from "../dtos/sell-limit.dto";

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
    body: payload,
    signal,
  });
}
