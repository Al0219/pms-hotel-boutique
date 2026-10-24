/** Confirmed BE-010B response from GET /api/v1/reports/on-books/daily. */
export interface DailyOnBooksRowDto {
  propertyId: string;
  timezone: string;
  currency: string;
  stayDate: string;
  physicalRooms: number;
  outOfOrderRooms: number;
  availableRooms: number;
  onBooksRooms: number;
  onBooksPercent: number | null;
  unavailableReason: "NO_AVAILABLE_ROOMS" | null;
}

export interface DailyOnBooksResponseDto {
  calculatedAt: string;
  rows: DailyOnBooksRowDto[];
}
