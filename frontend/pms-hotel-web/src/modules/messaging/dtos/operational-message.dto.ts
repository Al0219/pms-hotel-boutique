/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 * This is an internal operational messaging queue; it carries no guest contact channel and no direct guest message.
 */
export interface OperationalMessageDto {
  message_id: string;
  property_id: string;
  subject: string;
  body: string;
  /** One of OPERATIONS | RECEPTION | CONCIERGE. */
  sender_role: string;
  /** One of PENDING | IN_PROGRESS | RESOLVED. */
  status: string;
  /** Reference to a reservation. Null when the message is not related to a booking. */
  related_reservation_id: string | null;
  /** ISO 8601 datetime string. */
  created_at: string;
}

/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 */
export interface OperationalMessageListDto {
  messages: OperationalMessageDto[];
}
