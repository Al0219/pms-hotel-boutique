export interface CurrentMaintenanceProperty {
  readonly propertyId: string;
  readonly timezone: string;
  readonly openOrders: number;
  readonly inProgressOrders: number;
  readonly unresolvedOrders: number;
  readonly urgentUnresolvedOrders: number;
  readonly unassignedUnresolvedOrders: number;
  readonly roomLinkedUnresolvedOrders: number;
  readonly commonAreaUnresolvedOrders: number;
}

export interface CurrentMaintenanceReport {
  readonly calculatedAt: string;
  readonly rows: readonly CurrentMaintenanceProperty[];
}
