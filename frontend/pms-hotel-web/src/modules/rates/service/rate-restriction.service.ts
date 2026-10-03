import { httpRequest } from "@/lib/http";

import type {
  RateRestrictionQueryDto,
  RateRestrictionListResponseDto,
  BatchUpdateRateRestrictionsPayloadDto,
  RateRestrictionBatchResultDto,
} from "../dtos/rate-restriction.dto";
import type {
  RateRestriction,
  RateRestrictionFilter,
  BatchUpdateRateRestrictionsParams,
  RateRestrictionBatchResult,
} from "../model/rate-restriction";
import {
  toDtoRateRestrictionQuery,
  toDomainRateRestriction,
  toDtoBatchUpdatePayload,
  toDomainRateRestrictionBatchResult,
} from "../mappers/rate-restriction.mapper";

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
    json: payload,
    signal,
  });
}

export async function fetchRateRestrictions(
  filter: RateRestrictionFilter,
  signal?: AbortSignal
): Promise<RateRestriction[]> {
  const queryDto = toDtoRateRestrictionQuery(filter);
  const response = await fetchRateRestrictionsDto(queryDto, signal);
  return response.restrictions.map(toDomainRateRestriction);
}

export async function batchUpdateRateRestrictions(
  params: BatchUpdateRateRestrictionsParams,
  signal?: AbortSignal
): Promise<RateRestrictionBatchResult> {
  const payload = toDtoBatchUpdatePayload(params);
  const resultDto = await batchUpdateRateRestrictionsDto(payload, signal);
  return toDomainRateRestrictionBatchResult(resultDto);
}
