/** BE-010A-HKCUR-01: snapshot of physical rooms and tracked housekeeping state. */
export interface CurrentHousekeepingRowDto {
  propertyId: string;
  timezone: string;
  physicalRooms: number;
  trackedRooms: number;
  untrackedRooms: number;
  dirtyRooms: number;
  cleanRooms: number;
  inspectedRooms: number;
  dndRooms: number;
}

export interface CurrentHousekeepingResponseDto {
  calculatedAt: string;
  rows: CurrentHousekeepingRowDto[];
}
