export interface DailyOnBooksRow {
  readonly propertyId: string;
  readonly timezone: string;
  readonly currency: string;
  readonly stayDate: string;
  readonly physicalRooms: number;
  readonly outOfOrderRooms: number;
  readonly availableRooms: number;
  readonly onBooksRooms: number;
  readonly onBooksPercent: number | null;
  readonly unavailableReason: "NO_AVAILABLE_ROOMS" | null;
}

export interface DailyOnBooksReport {
  readonly calculatedAt: string;
  readonly rows: DailyOnBooksRow[];
}
