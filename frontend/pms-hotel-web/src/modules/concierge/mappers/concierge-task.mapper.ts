import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import type { ConciergeTaskDto } from "../dtos/concierge-task.dto";
import { isConciergeTaskStatus, type ConciergeTask } from "../model/concierge-task";

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

export function mapConciergeTask(dto: ConciergeTaskDto): ConciergeTask {
  const status = dto.status.trim();

  if (!isConciergeTaskStatus(status)) {
    throw new DomainMappingError("INVALID_CONCIERGE_TASK_STATUS");
  }

  return {
    id: requiredText(dto.task_id, "INVALID_CONCIERGE_TASK_ID"),
    propertyId: requiredText(dto.property_id, "INVALID_CONCIERGE_TASK_PROPERTY_ID"),
    title: requiredText(dto.title, "INVALID_CONCIERGE_TASK_TITLE"),
    status,
    receptionReference: optionalText(dto.reception_reference),
  };
}
