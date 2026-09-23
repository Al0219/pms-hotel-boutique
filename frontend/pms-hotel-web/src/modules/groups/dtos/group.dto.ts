/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 */
export interface GroupDto {
  group_id: string;
  property_id: string;
  name: string;
  /** One of INQUIRY | TENTATIVE | DEFINITE | IN_HOUSE | CLOSED. */
  lifecycle_status: string;
  /** Null when the group has no commercial room block reference. */
  room_block_reference: string | null;
  /** Null when no audit entry is available yet. */
  audit_reference: string | null;
}

/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 */
export interface GroupListDto {
  groups: GroupDto[];
}
