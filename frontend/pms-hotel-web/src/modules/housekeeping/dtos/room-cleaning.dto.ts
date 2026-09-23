/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 * Base cleaning status only: overlays (DND/Turndown/Pickup) travel separately.
 */
export interface RoomCleaningDto {
  room_id: string;
  property_id: string;
  room_label: string;
  /** One of DIRTY | CLEAN | INSPECTED. */
  cleaning_status: string;
}

/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 */
export interface RoomCleaningListDto {
  rooms: RoomCleaningDto[];
}
