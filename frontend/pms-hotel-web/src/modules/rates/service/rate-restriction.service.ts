import {
  RateRestrictionFilter,
  RateRestriction,
  BatchUpdateRateRestrictionsParams,
  RateRestrictionBatchResult,
} from "../model/rate-restriction";
import {
  toDtoRateRestrictionQuery,
  toDomainRateRestriction,
  toDtoBatchUpdatePayload,
  toDomainRateRestrictionBatchResult,
} from "../mappers/rate-restriction.mapper";
import { RateRestrictionDto, RateRestrictionBatchResultDto } from "../dtos/rate-restriction.dto";

export async function fetchRateRestrictions(
  filter: RateRestrictionFilter
): Promise<RateRestriction[]> {
  const queryDto = toDtoRateRestrictionQuery(filter);
  const params = new URLSearchParams();
  params.set("property_id", queryDto.property_id);
  params.set("start_date", queryDto.start_date);
  params.set("end_date", queryDto.end_date);
  if (queryDto.rate_plan_id) params.set("rate_plan_id", queryDto.rate_plan_id);
  if (queryDto.room_type_id) params.set("room_type_id", queryDto.room_type_id);

  const res = await fetch(`/api/v1/private/rates/restrictions?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Error al consultar restricciones tarifarias: ${res.statusText}`);
  }
  const data: { restrictions: RateRestrictionDto[] } = await res.json();
  return (data.restrictions || []).map(toDomainRateRestriction);
}

export async function batchUpdateRateRestrictions(
  params: BatchUpdateRateRestrictionsParams
): Promise<RateRestrictionBatchResult> {
  const payload = toDtoBatchUpdatePayload(params);
  const res = await fetch(`/api/v1/private/rates/restrictions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Error al actualizar restricciones: ${res.statusText}`);
  }

  const data: RateRestrictionBatchResultDto = await res.json();
  return toDomainRateRestrictionBatchResult(data);
}
