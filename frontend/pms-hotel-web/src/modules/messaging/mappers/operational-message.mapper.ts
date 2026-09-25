import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { optionalText, parseDateTime, requiredText } from "@/lib/mapper";

import type { OperationalMessageDto } from "../dtos/operational-message.dto";
import { isOperationalMessageSenderRole, isOperationalMessageStatus, type OperationalMessage } from "../model/operational-message";

export function mapOperationalMessage(dto: OperationalMessageDto): OperationalMessage {
  const status = dto.status.trim();

  if (!isOperationalMessageStatus(status)) {
    throw new DomainMappingError("INVALID_OPERATIONAL_MESSAGE_STATUS");
  }

  const senderRole = dto.sender_role.trim();

  if (!isOperationalMessageSenderRole(senderRole)) {
    throw new DomainMappingError("INVALID_OPERATIONAL_MESSAGE_SENDER_ROLE");
  }

  return {
    id: requiredText(dto.message_id, "INVALID_OPERATIONAL_MESSAGE_ID"),
    propertyId: requiredText(dto.property_id, "INVALID_OPERATIONAL_MESSAGE_PROPERTY_ID"),
    subject: requiredText(dto.subject, "INVALID_OPERATIONAL_MESSAGE_SUBJECT"),
    body: requiredText(dto.body, "INVALID_OPERATIONAL_MESSAGE_BODY"),
    senderRole,
    status,
    relatedReservationId: optionalText(dto.related_reservation_id),
    createdAt: parseDateTime(dto.created_at.trim(), "INVALID_OPERATIONAL_MESSAGE_CREATED_AT"),
  };
}
