import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { optionalText, parseAmount, parseCount, parseDateTime, requiredText } from "@/lib/mapper";

import type { RoomMoveApplyDto, RoomMoveCandidateDto, RoomMovePreviewDto } from "../dtos/room-move.dto";
import type { RoomMoveCandidate, RoomMovePreview, RoomMoveResult } from "../model/room-move";

function mapCandidate(dto: RoomMoveCandidateDto): RoomMoveCandidate {
  return {
    roomId: requiredText(dto.room_id, "INVALID_ROOM_MOVE_CANDIDATE_ROOM_ID"),
    roomLabel: requiredText(dto.room_label, "INVALID_ROOM_MOVE_CANDIDATE_ROOM_LABEL"),
    roomType: requiredText(dto.room_type, "INVALID_ROOM_MOVE_CANDIDATE_ROOM_TYPE"),
    isCompatible: dto.is_compatible === true,
    compatibilityNote: optionalText(dto.compatibility_note),
    availabilityState: requiredText(dto.availability_state, "INVALID_ROOM_MOVE_CANDIDATE_AVAILABILITY"),
    availabilityNote: optionalText(dto.availability_note),
  };
}

export function mapRoomMovePreview(dto: RoomMovePreviewDto): RoomMovePreview {
  const currentRoom = dto.current_room;

  return {
    reservationId: requiredText(dto.reservation_id, "INVALID_ROOM_MOVE_RESERVATION_ID"),
    stayId: requiredText(dto.stay_id, "INVALID_ROOM_MOVE_STAY_ID"),
    guestName: requiredText(dto.guest_name, "INVALID_ROOM_MOVE_GUEST_NAME"),
    currentRoom: {
      roomId: requiredText(currentRoom.room_id, "INVALID_ROOM_MOVE_CURRENT_ROOM_ID"),
      roomLabel: requiredText(currentRoom.room_label, "INVALID_ROOM_MOVE_CURRENT_ROOM_LABEL"),
      roomType: requiredText(currentRoom.room_type, "INVALID_ROOM_MOVE_CURRENT_ROOM_TYPE"),
    },
    candidates: dto.candidates.map(mapCandidate),
    financeSummary: {
      totalAmount: parseAmount(dto.finance_summary.total_amount, "INVALID_ROOM_MOVE_TOTAL_AMOUNT"),
      paidAmount: parseAmount(dto.finance_summary.paid_amount, "INVALID_ROOM_MOVE_PAID_AMOUNT"),
      balanceAmount: parseAmount(dto.finance_summary.balance_amount, "INVALID_ROOM_MOVE_BALANCE_AMOUNT"),
      currency: requiredText(dto.finance_summary.currency, "INVALID_ROOM_MOVE_CURRENCY"),
      paidCount: parseCount(dto.finance_summary.paid_count, "INVALID_ROOM_MOVE_PAID_COUNT"),
      totalCount: parseCount(dto.finance_summary.total_count, "INVALID_ROOM_MOVE_TOTAL_COUNT"),
    },
    hkImpact: {
      fromRoomState: requiredText(dto.hk_impact.from_room_state, "INVALID_ROOM_MOVE_HK_FROM_STATE"),
      toRoomState: requiredText(dto.hk_impact.to_room_state, "INVALID_ROOM_MOVE_HK_TO_STATE"),
      note: requiredText(dto.hk_impact.note, "INVALID_ROOM_MOVE_HK_NOTE"),
    },
    folioNote: requiredText(dto.folio_note, "INVALID_ROOM_MOVE_FOLIO_NOTE"),
    canMove: dto.can_move === true,
    reason: optionalText(dto.reason),
  };
}

export function mapRoomMoveApply(dto: RoomMoveApplyDto): RoomMoveResult {
  const status = requiredText(dto.status, "INVALID_ROOM_MOVE_STATUS");

  if (status !== "ROOM_MOVED") {
    throw new DomainMappingError("INVALID_ROOM_MOVE_STATUS");
  }

  return {
    reservationId: requiredText(dto.reservation_id, "INVALID_ROOM_MOVE_RESERVATION_ID"),
    stayId: requiredText(dto.stay_id, "INVALID_ROOM_MOVE_STAY_ID"),
    status,
    fromRoomId: requiredText(dto.from_room_id, "INVALID_ROOM_MOVE_FROM_ROOM_ID"),
    toRoomId: requiredText(dto.to_room_id, "INVALID_ROOM_MOVE_TO_ROOM_ID"),
    movedAt: parseDateTime(dto.moved_at, "INVALID_ROOM_MOVED_AT"),
    hkTransition: requiredText(dto.hk_transition, "INVALID_ROOM_MOVE_HK_TRANSITION"),
    auditSummary: requiredText(dto.audit_summary, "INVALID_ROOM_MOVE_AUDIT_SUMMARY"),
    message: requiredText(dto.message, "INVALID_ROOM_MOVE_MESSAGE"),
  };
}