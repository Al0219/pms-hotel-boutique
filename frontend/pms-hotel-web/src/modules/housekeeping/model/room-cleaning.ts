export const ROOM_CLEANING_STATUSES = ["DIRTY", "CLEAN", "INSPECTED"] as const;

export type RoomCleaningStatus = (typeof ROOM_CLEANING_STATUSES)[number];

export interface RoomCleaning {
  id: string;
  propertyId: string;
  roomLabel: string;
  status: RoomCleaningStatus;
}

export function isRoomCleaningStatus(value: string): value is RoomCleaningStatus {
  return (ROOM_CLEANING_STATUSES as readonly string[]).includes(value);
}
