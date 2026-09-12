import {
  SellLimitDto,
  UpdateSellLimitRequestDto,
  SellLimitListResponseDto,
} from "../dtos/sell-limit.dto";
import {
  SellLimit,
  UpdateSellLimitParams,
  calculateSellableATS,
} from "../model/sell-limit";

export function toDomainSellLimit(dto: SellLimitDto): SellLimit {
  const recalculated = calculateSellableATS(
    dto.physical_rooms_count,
    dto.ooo_rooms_count,
    dto.oos_rooms_count,
    dto.sold_rooms_count,
    dto.overbooking_limit,
    dto.sell_limit,
  );

  return {
    limitId: dto.limit_id,
    propertyId: dto.property_id,
    roomTypeId: dto.room_type_id,
    roomTypeName: dto.room_type_name,
    date: dto.date,
    physicalRoomsCount: dto.physical_rooms_count,
    oooRoomsCount: dto.ooo_rooms_count,
    oosRoomsCount: dto.oos_rooms_count,
    soldRoomsCount: dto.sold_rooms_count,
    overbookingLimit: dto.overbooking_limit,
    sellLimit: dto.sell_limit,
    calculatedATS: recalculated,
    updatedAt: new Date(dto.updated_at),
  };
}

export function toDomainSellLimitList(dto: SellLimitListResponseDto): SellLimit[] {
  return (dto.items || []).map(toDomainSellLimit);
}

export function toDtoUpdateSellLimit(params: UpdateSellLimitParams): UpdateSellLimitRequestDto {
  return {
    property_id: params.propertyId,
    room_type_id: params.roomTypeId,
    date: params.date,
    overbooking_limit: Math.max(0, Math.floor(params.overbookingLimit || 0)),
    sell_limit: params.sellLimit !== null && params.sellLimit !== undefined ? Math.max(0, Math.floor(params.sellLimit)) : null,
  };
}
