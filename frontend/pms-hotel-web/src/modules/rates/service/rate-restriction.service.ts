import { httpRequest } from "@/lib/http";

import type {
  RateRestrictionQueryDto,
  RateRestrictionListResponseDto,
  BatchUpdateRateRestrictionsPayloadDto,
  RateRestrictionBatchResultDto,
} from "../dtos/rate-restriction.dto";

export async function fetchRateRestrictionsDto(
  queryDto: RateRestrictionQueryDto,
  signal?: AbortSignal
): Promise<RateRestrictionListResponseDto> {
  const params = new URLSearchParams();
  params.set("property_id", queryDto.property_id);
  params.set("start_date", queryDto.start_date);
  params.set("end_date", queryDto.end_date);
  if (queryDto.rate_plan_id) params.set("rate_plan_id", queryDto.rate_plan_id);
  if (queryDto.room_type_id) params.set("room_type_id", queryDto.room_type_id);

  const queryString = params.toString();
  const path = queryString
    ? `/api/v1/private/rates/restrictions?${queryString}`
    : "/api/v1/private/rates/restrictions";

  return httpRequest<RateRestrictionListResponseDto>({
    path,
    method: "GET",
    signal,
  });
}

export async function batchUpdateRateRestrictionsDto(
  payload: BatchUpdateRateRestrictionsPayloadDto,
  signal?: AbortSignal
): Promise<RateRestrictionBatchResultDto> {
  return httpRequest<RateRestrictionBatchResultDto>({
    path: "/api/v1/private/rates/restrictions",
    method: "POST",
    body: payload,
    signal,
  });
}
