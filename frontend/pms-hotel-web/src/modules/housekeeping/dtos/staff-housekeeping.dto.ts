/** Confirmed Backend contract51. Untracked physical rooms have no cleaning state. */
export interface StaffHousekeepingRoomDto {
  roomId: string; propertyId: string; roomCode: string; roomTypeId: string; roomTypeName: string;
  tracked: boolean; status: string | null; dnd: boolean | null; updatedAt: string | null;
}
export interface StaffHousekeepingBoardDto { propertyId: string; rooms: StaffHousekeepingRoomDto[] }
