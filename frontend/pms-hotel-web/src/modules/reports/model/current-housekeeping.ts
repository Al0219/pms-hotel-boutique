export interface CurrentHousekeepingProperty {
  readonly propertyId: string;
  readonly timezone: string;
  readonly physicalRooms: number;
  readonly trackedRooms: number;
  readonly untrackedRooms: number;
  readonly dirtyRooms: number;
  readonly cleanRooms: number;
  readonly inspectedRooms: number;
  readonly dndRooms: number;
}

export interface CurrentHousekeepingReport {
  readonly calculatedAt: string;
  readonly rows: readonly CurrentHousekeepingProperty[];
}
