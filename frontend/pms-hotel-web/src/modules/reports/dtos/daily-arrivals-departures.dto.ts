/** Confirmed BE-010A-ARRDEP-01 Backend contract: current pending stays only. */
export interface DailyArrivalsDeparturesRowDto {
  propertyId: string;
  timezone: string;
  currency: string;
  date: string;
  pendingArrivals: number;
  pendingDepartures: number;
}

export interface DailyArrivalsDeparturesResponseDto {
  calculatedAt: string;
  rows: DailyArrivalsDeparturesRowDto[];
}
