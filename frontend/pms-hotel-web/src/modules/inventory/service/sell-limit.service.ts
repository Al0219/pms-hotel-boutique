import {
  SellLimit,
  UpdateSellLimitParams,
} from "../model/sell-limit";
import {
  toDomainSellLimitList,
  toDomainSellLimit,
  toDtoUpdateSellLimit,
} from "../mappers/sell-limit.mapper";
import {
  SellLimitListResponseDto,
  SellLimitDto,
} from "../dtos/sell-limit.dto";

export async function fetchSellLimits(
  propertyId: string,
  startDate?: string,
  endDate?: string,
  roomTypeId?: string,
): Promise<SellLimit[]> {
  const params = new URLSearchParams();
  params.set("property_id", propertyId);
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  if (roomTypeId) params.set("room_type_id", roomTypeId);

  const res = await fetch(`/api/v1/private/inventory/sell-limits?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Error al consultar límites de venta: ${res.statusText}`);
  }

  const data: SellLimitListResponseDto = await res.json();
  return toDomainSellLimitList(data);
}

export async function updateSellLimit(
  params: UpdateSellLimitParams,
): Promise<SellLimit> {
  const payload = toDtoUpdateSellLimit(params);
  const res = await fetch(`/api/v1/private/inventory/sell-limits`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Error al actualizar límite de venta/overbooking: ${res.statusText}`);
  }

  const data: SellLimitDto = await res.json();
  return toDomainSellLimit(data);
}
