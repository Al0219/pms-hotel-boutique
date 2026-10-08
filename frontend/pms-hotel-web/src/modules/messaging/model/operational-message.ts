export const OPERATIONAL_MESSAGE_STATUSES = ["PENDING", "IN_PROGRESS", "RESOLVED"] as const;

export type OperationalMessageStatus = (typeof OPERATIONAL_MESSAGE_STATUSES)[number];

export const OPERATIONAL_MESSAGE_SENDER_ROLES = ["OPERATIONS", "RECEPTION", "CONCIERGE"] as const;

export type OperationalMessageSenderRole = (typeof OPERATIONAL_MESSAGE_SENDER_ROLES)[number];

export interface OperationalMessage {
  id: string;
  propertyId: string;
  subject: string;
  body: string;
  senderRole: OperationalMessageSenderRole;
  status: OperationalMessageStatus;
  /** Reference to a reservation when the message relates to a specific booking. */
  relatedReservationId: string | null;
  createdAt: Date;
}

export function isOperationalMessageStatus(value: string): value is OperationalMessageStatus {
  return (OPERATIONAL_MESSAGE_STATUSES as readonly string[]).includes(value);
}

export function isOperationalMessageSenderRole(value: string): value is OperationalMessageSenderRole {
  return (OPERATIONAL_MESSAGE_SENDER_ROLES as readonly string[]).includes(value);
}
