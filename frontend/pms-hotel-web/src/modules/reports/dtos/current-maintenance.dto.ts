/** BE-010A-MTCUR-01: current unresolved maintenance orders by property. */
export interface CurrentMaintenanceRowDto {
  propertyId: string;
  timezone: string;
  openOrders: number;
  inProgressOrders: number;
  unresolvedOrders: number;
  urgentUnresolvedOrders: number;
  unassignedUnresolvedOrders: number;
  roomLinkedUnresolvedOrders: number;
  commonAreaUnresolvedOrders: number;
}

export interface CurrentMaintenanceResponseDto {
  calculatedAt: string;
  rows: CurrentMaintenanceRowDto[];
}
