import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { optionalText, requiredText } from "@/lib/mapper";

import type { GroupDto } from "../dtos/group.dto";
import type { Group } from "../model/group";
import { isGroupLifecycleStatus } from "../model/group-lifecycle";

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
