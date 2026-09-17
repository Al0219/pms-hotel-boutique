import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import type { GroupDto } from "../dtos/group.dto";
import type { Group } from "../model/group";
import { isGroupLifecycleStatus } from "../model/group-lifecycle";

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

export function mapGroup(dto: GroupDto): Group {
  const status = dto.lifecycle_status.trim();

  if (!isGroupLifecycleStatus(status)) {
    throw new DomainMappingError("INVALID_GROUP_LIFECYCLE_STATUS");
  }

  return {
    id: requiredText(dto.group_id, "INVALID_GROUP_ID"),
    propertyId: requiredText(dto.property_id, "INVALID_GROUP_PROPERTY_ID"),
    name: requiredText(dto.name, "INVALID_GROUP_NAME"),
    status,
    roomBlockReference: optionalText(dto.room_block_reference),
    auditReference: optionalText(dto.audit_reference),
  };
}
