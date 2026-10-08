import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { optionalText, parseCount, parseDay, requiredText } from "@/lib/mapper";

import type { GroupDto, RoomingEntryDto } from "../dtos/group.dto";
import type { Group, GroupRoomBlock, RoomingEntry } from "../model/group";
import { isGroupLifecycleStatus } from "../model/group-lifecycle";

function mapRoomingEntry(dto: RoomingEntryDto): RoomingEntry {
  return {
    id: requiredText(dto.entry_id, "INVALID_ROOMING_ENTRY_ID"),
    guestName: requiredText(dto.guest_name, "INVALID_ROOMING_ENTRY_GUEST"),
    roomLabel: requiredText(dto.room_label, "INVALID_ROOMING_ENTRY_ROOM"),
  };
}

function mapGroupBlock(dto: GroupDto, reference: string): GroupRoomBlock | null {
  const { block_start_date: start, block_end_date: end, rooms_blocked: blocked, rooms_picked_up: picked } = dto;

  if (start == null && end == null && blocked == null && picked == null) {
    return null;
  }

  if (start == null || end == null || blocked == null || picked == null) {
    throw new DomainMappingError("INVALID_GROUP_BLOCK");
  }

  const roomsBlocked = parseCount(blocked, "INVALID_GROUP_BLOCK_ROOMS");
  const roomsPickedUp = parseCount(picked, "INVALID_GROUP_BLOCK_PICKUP");

  if (roomsPickedUp > roomsBlocked) {
    throw new DomainMappingError("INVALID_GROUP_BLOCK_PICKUP");
  }

  return {
    reference,
    startDate: parseDay(start, "INVALID_GROUP_BLOCK_DATES"),
    endDate: parseDay(end, "INVALID_GROUP_BLOCK_DATES"),
    roomsBlocked,
    roomsPickedUp,
  };
}

export function mapGroup(dto: GroupDto): Group {
  const status = dto.lifecycle_status.trim();

  if (!isGroupLifecycleStatus(status)) {
    throw new DomainMappingError("INVALID_GROUP_LIFECYCLE_STATUS");
  }

  const roomBlockReference = optionalText(dto.room_block_reference);

  return {
    id: requiredText(dto.group_id, "INVALID_GROUP_ID"),
    propertyId: requiredText(dto.property_id, "INVALID_GROUP_PROPERTY_ID"),
    name: requiredText(dto.name, "INVALID_GROUP_NAME"),
    status,
    roomBlockReference,
    block: roomBlockReference ? mapGroupBlock(dto, roomBlockReference) : null,
    roomingList: (dto.rooming_list ?? []).map(mapRoomingEntry),
    auditReference: optionalText(dto.audit_reference),
  };
}
