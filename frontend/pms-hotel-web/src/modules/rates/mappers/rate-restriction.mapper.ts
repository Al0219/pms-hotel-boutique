import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import type {
  RateRestrictionDto,
  RateRestrictionQueryDto,
  UpdateRateRestrictionItemDto,
  BatchUpdateRateRestrictionsPayloadDto,
  RateRestrictionBatchResultDto,
} from "../dtos/rate-restriction.dto";
import type {
  RateRestriction,
  RateRestrictionFilter,
  RateRestrictionUpdateItem,
  BatchUpdateRateRestrictionsParams,
  RateRestrictionBatchResult,
} from "../model/rate-restriction";

export function toDomainRateRestriction(dto: RateRestrictionDto): RateRestriction {
  if (!dto || typeof dto !== "object") {
    throw new DomainMappingError("RateRestrictionDto debe ser un objeto", "RateRestriction");
  }

  if (!dto.restriction_id || typeof dto.restriction_id !== "string") {
    throw new DomainMappingError("restriction_id requerido y debe ser string", "RateRestriction");
  }

  if (!dto.property_id || typeof dto.property_id !== "string") {
    throw new DomainMappingError("property_id requerido y debe ser string", "RateRestriction");
  }

  if (!dto.date || typeof dto.date !== "string") {
    throw new DomainMappingError("date requerido y debe ser string ISO", "RateRestriction");
  }

  const createdAt = dto.created_at ? new Date(dto.created_at) : new Date();
  if (isNaN(createdAt.getTime())) {
    throw new DomainMappingError("created_at inválido", "RateRestriction");
  }

  const updatedAt = dto.updated_at ? new Date(dto.updated_at) : new Date();
  if (isNaN(updatedAt.getTime())) {
    throw new DomainMappingError("updated_at inválido", "RateRestriction");
  }

  return {
    restrictionId: dto.restriction_id,
    propertyId: dto.property_id,
    ratePlanId: dto.rate_plan_id || "",
    roomTypeId: dto.room_type_id || "",
    date: dto.date,
    closedToArrival: Boolean(dto.closed_to_arrival),
    closedToDeparture: Boolean(dto.closed_to_departure),
    minLengthOfStay: Math.max(1, Math.floor(dto.min_length_of_stay || 1)),
    stopSell: Boolean(dto.stop_sell),
    createdAt,
    updatedAt,
  };
}

export function toDtoRateRestrictionQuery(filter: RateRestrictionFilter): RateRestrictionQueryDto {
  if (!filter || !filter.propertyId || !filter.startDate || !filter.endDate) {
    throw new DomainMappingError("Filtro de consulta incompleto", "RateRestrictionQueryDto");
  }

  return {
    property_id: filter.propertyId,
    start_date: filter.startDate,
    end_date: filter.endDate,
    rate_plan_id: filter.ratePlanId,
    room_type_id: filter.roomTypeId,
  };
}

export function toDtoUpdateRestrictionItem(item: RateRestrictionUpdateItem): UpdateRateRestrictionItemDto {
  if (!item || !item.ratePlanId || !item.roomTypeId || !item.date) {
    throw new DomainMappingError("Item de actualización de restricción inválido", "UpdateRateRestrictionItemDto");
  }

  const result: UpdateRateRestrictionItemDto = {
    rate_plan_id: item.ratePlanId,
    room_type_id: item.roomTypeId,
    date: item.date,
  };

  if (item.closedToArrival !== undefined) {
    result.closed_to_arrival = item.closedToArrival;
  }
  if (item.closedToDeparture !== undefined) {
    result.closed_to_departure = item.closedToDeparture;
  }
  if (item.minLengthOfStay !== undefined) {
    result.min_length_of_stay = Math.max(1, Math.floor(item.minLengthOfStay));
  }
  if (item.stopSell !== undefined) {
    result.stop_sell = item.stopSell;
  }

  return result;
}

export function toDtoBatchUpdatePayload(
  params: BatchUpdateRateRestrictionsParams
): BatchUpdateRateRestrictionsPayloadDto {
  if (!params || !params.propertyId || !Array.isArray(params.restrictions)) {
    throw new DomainMappingError("Parámetros de actualización por lote inválidos", "BatchUpdateRateRestrictionsPayloadDto");
  }

  return {
    property_id: params.propertyId,
    restrictions: params.restrictions.map(toDtoUpdateRestrictionItem),
  };
}

export function toDomainRateRestrictionBatchResult(
  dto: RateRestrictionBatchResultDto
): RateRestrictionBatchResult {
  if (!dto || typeof dto !== "object" || typeof dto.success !== "boolean") {
    throw new DomainMappingError("RateRestrictionBatchResultDto inválido", "RateRestrictionBatchResult");
  }

  return {
    success: dto.success,
    updatedCount: dto.updated_count || 0,
    restrictions: (dto.restrictions || []).map(toDomainRateRestriction),
    errorMessage: dto.error_message,
  };
}
