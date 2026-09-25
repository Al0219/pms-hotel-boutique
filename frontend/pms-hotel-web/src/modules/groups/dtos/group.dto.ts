/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 */
export interface RoomingEntryDto {
  entry_id: string;
  guest_name: string;
  room_label: string;
}

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
  /** Block dates (YYYY-MM-DD). Null when the group has no dated block. */
  block_start_date?: string | null;
  /** Block dates (YYYY-MM-DD). Null when the group has no dated block. */
  block_end_date?: string | null;
  /** Rooms held by the block. Null when the group has no quantified block. */
  rooms_blocked?: number | null;
  /** Rooms already picked up from the block. Null when pickup is not tracked yet. */
  rooms_picked_up?: number | null;
  /** Rooming list. Absent when the group has no rooming entries yet. */
  rooming_list?: RoomingEntryDto[];
}

/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 */
export interface GroupListDto {
  groups: GroupDto[];
}
