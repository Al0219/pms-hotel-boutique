import {
  RateRestrictionDto,
  RateRestrictionQueryDto,
  UpdateRateRestrictionItemDto,
  BatchUpdateRateRestrictionsPayloadDto,
  RateRestrictionBatchResultDto,
} from "../dtos/rate-restriction.dto";
import {
  RateRestriction,
  RateRestrictionFilter,
  RateRestrictionUpdateItem,
  BatchUpdateRateRestrictionsParams,
  RateRestrictionBatchResult,
} from "../model/rate-restriction";

export function toDomainRateRestriction(dto: RateRestrictionDto): RateRestriction {
  return {
    restrictionId: dto.restriction_id,
    propertyId: dto.property_id,
    ratePlanId: dto.rate_plan_id,
    roomTypeId: dto.room_type_id,
    date: dto.date,
    closedToArrival: Boolean(dto.closed_to_arrival),
    closedToDeparture: Boolean(dto.closed_to_departure),
    minLengthOfStay: Math.max(1, Math.floor(dto.min_length_of_stay || 1)),
    stopSell: Boolean(dto.stop_sell),
    createdAt: new Date(dto.created_at),
    updatedAt: new Date(dto.updated_at),
  };
}

export function toDtoRateRestrictionQuery(filter: RateRestrictionFilter): RateRestrictionQueryDto {
  return {
    property_id: filter.propertyId,
    start_date: filter.startDate,
    end_date: filter.endDate,
    rate_plan_id: filter.ratePlanId,
    room_type_id: filter.roomTypeId,
  };
}

export function toDtoUpdateRestrictionItem(item: RateRestrictionUpdateItem): UpdateRateRestrictionItemDto {
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
  return {
    property_id: params.propertyId,
    restrictions: params.restrictions.map(toDtoUpdateRestrictionItem),
  };
}

export function toDomainRateRestrictionBatchResult(
  dto: RateRestrictionBatchResultDto
): RateRestrictionBatchResult {
  return {
    success: dto.success,
    updatedCount: dto.updated_count,
    restrictions: (dto.restrictions || []).map(toDomainRateRestriction),
    errorMessage: dto.error_message,
  };
}
