import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { parseDateTime, requiredText } from "@/lib/mapper";

import type {
  CleaningTransitionResultDto,
  DiscrepancyResolutionDto,
} from "../dtos/room-cleaning-transition.dto";
import { isRoomCleaningStatus } from "../model/room-cleaning";
import type { CleaningTransitionResult, DiscrepancyResolution } from "../model/room-cleaning-transition";

export function mapCleaningTransitionResult(dto: CleaningTransitionResultDto): CleaningTransitionResult {
  const status = dto.cleaning_status.trim();

  if (!isRoomCleaningStatus(status)) {
    throw new DomainMappingError("INVALID_CLEANING_TRANSITION_STATUS");
  }

  return {
    roomId: requiredText(dto.room_id, "INVALID_CLEANING_TRANSITION_ROOM_ID"),
    propertyId: requiredText(dto.property_id, "INVALID_CLEANING_TRANSITION_PROPERTY_ID"),
    status,
  };
}

export function mapDiscrepancyResolution(dto: DiscrepancyResolutionDto): DiscrepancyResolution {
  return {
    roomId: requiredText(dto.room_id, "INVALID_DISCREPANCY_RESOLUTION_ROOM_ID"),
    reason: requiredText(dto.reason, "INVALID_DISCREPANCY_RESOLUTION_REASON"),
    resolvedAt: parseDateTime(dto.resolved_at, "INVALID_DISCREPANCY_RESOLUTION_DATE"),
  };
}
