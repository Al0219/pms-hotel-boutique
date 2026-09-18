import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import type { RoomCleaningDto } from "../dtos/room-cleaning.dto";
import { isRoomCleaningStatus, type RoomCleaning } from "../model/room-cleaning";

function requiredText(value: string, errorCode: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new DomainMappingError(errorCode);
  }

  return normalizedValue;
}

export function mapRoomCleaning(dto: RoomCleaningDto): RoomCleaning {
  const status = dto.cleaning_status.trim();

  if (!isRoomCleaningStatus(status)) {
    throw new DomainMappingError("INVALID_ROOM_CLEANING_STATUS");
  }

  return {
    id: requiredText(dto.room_id, "INVALID_ROOM_CLEANING_ID"),
    propertyId: requiredText(dto.property_id, "INVALID_ROOM_CLEANING_PROPERTY_ID"),
    roomLabel: requiredText(dto.room_label, "INVALID_ROOM_CLEANING_LABEL"),
    status,
  };
}
