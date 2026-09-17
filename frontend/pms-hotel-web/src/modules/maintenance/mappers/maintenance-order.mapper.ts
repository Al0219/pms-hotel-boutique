import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import type { MaintenanceOrderDto, MaintenanceOrderEventDto } from "../dtos/maintenance-order.dto";
import {
  isMaintenanceOrderStatus,
  isMaintenanceRoomImpact,
  type MaintenanceOrder,
  type MaintenanceOrderEvent,
} from "../model/maintenance-order";

function requiredText(value: string, errorCode: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new DomainMappingError(errorCode);
  }

  return normalizedValue;
}

function optionalText(value: string | null): string | null {
  const normalizedValue = value?.trim();
  return normalizedValue || null;
}

function mapEvent(dto: MaintenanceOrderEventDto): MaintenanceOrderEvent {
  const status = dto.status.trim();

  if (!isMaintenanceOrderStatus(status)) {
    throw new DomainMappingError("INVALID_MAINTENANCE_EVENT_STATUS");
  }

  return {
    status,
    note: optionalText(dto.note),
    actorReference: optionalText(dto.actor_reference),
  };
}

export function mapMaintenanceOrder(dto: MaintenanceOrderDto): MaintenanceOrder {
  const status = dto.status.trim();
  const roomImpact = dto.room_impact.trim();

  if (!isMaintenanceOrderStatus(status)) {
    throw new DomainMappingError("INVALID_MAINTENANCE_ORDER_STATUS");
  }

  if (!isMaintenanceRoomImpact(roomImpact)) {
    throw new DomainMappingError("INVALID_MAINTENANCE_ROOM_IMPACT");
  }

  return {
    id: requiredText(dto.order_id, "INVALID_MAINTENANCE_ORDER_ID"),
    propertyId: requiredText(dto.property_id, "INVALID_MAINTENANCE_ORDER_PROPERTY_ID"),
    roomId: requiredText(dto.room_id, "INVALID_MAINTENANCE_ORDER_ROOM_ID"),
    title: requiredText(dto.title, "INVALID_MAINTENANCE_ORDER_TITLE"),
    status,
    roomImpact,
    history: dto.history.map(mapEvent),
  };
}
