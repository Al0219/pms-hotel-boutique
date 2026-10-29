import type { RoomCleaningStatus } from './room-cleaning';

export interface StaffHousekeepingRoom {
  roomId: string; propertyId: string; roomCode: string; roomTypeId: string; roomTypeName: string;
  tracked: boolean; status: RoomCleaningStatus | null; dnd: boolean | null;
  /** Keep PostgreSQL precision: this exact UTC value is the concurrency token. */
  updatedAt: string | null;
  cleaningReason: string | null;
}
export interface StaffHousekeepingBoard { propertyId: string; rooms: StaffHousekeepingRoom[] }
export type HousekeepingChange = { room: StaffHousekeepingRoom } & (
  { action: 'tracking' } | { action: 'status'; toStatus: RoomCleaningStatus; reason: string | null }
  | { action: 'dnd'; dnd: boolean });
