import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { parseDay, requiredText } from "@/lib/mapper";

import type { RoomStatusChangeResultDto } from "../dtos/room-status-change.dto";
import { isRoomStatus } from "../model/room";
import type { RoomStatusChangeResult } from "../model/room-status-change";

function optionalDay(value: string | null, errorCode: string): Date | null {
  if (value === null) {
    return null;
  }
  return parseDay(value, errorCode);
}

export function mapRoomStatusChangeResult(dto: RoomStatusChangeResultDto): RoomStatusChangeResult {
  const status = dto.status.trim();

  if (!isRoomStatus(status)) {
    throw new DomainMappingError("INVALID_ROOM_STATUS_CHANGE_STATUS");
  }

  return {
    roomId: requiredText(dto.room_id, "INVALID_ROOM_STATUS_CHANGE_ROOM_ID"),
    propertyId: requiredText(dto.property_id, "INVALID_ROOM_STATUS_CHANGE_PROPERTY_ID"),
    status,
    blockedFrom: optionalDay(dto.blocked_from, "INVALID_ROOM_STATUS_CHANGE_PERIOD"),
    blockedTo: optionalDay(dto.blocked_to, "INVALID_ROOM_STATUS_CHANGE_PERIOD"),
  };
}
