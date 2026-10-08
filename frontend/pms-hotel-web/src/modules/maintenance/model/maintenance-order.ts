export const MAINTENANCE_ORDER_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED"] as const;

export type MaintenanceOrderStatus = (typeof MAINTENANCE_ORDER_STATUSES)[number];

/** Room impact declared by an order. Release is never automatic. */
export const MAINTENANCE_ROOM_IMPACTS = ["NONE", "OOO", "OOS"] as const;

export type MaintenanceRoomImpact = (typeof MAINTENANCE_ROOM_IMPACTS)[number];

export interface MaintenanceOrderEvent {
  status: MaintenanceOrderStatus;
  note: string | null;
  actorReference: string | null;
}

export interface MaintenanceOrder {
  id: string;
  propertyId: string;
  roomId: string;
  title: string;
  status: MaintenanceOrderStatus;
  /** Declared room impact; this module never turns it back to sellable by itself. */
  roomImpact: MaintenanceRoomImpact;
  history: ReadonlyArray<MaintenanceOrderEvent>;
}

export function isMaintenanceOrderStatus(value: string): value is MaintenanceOrderStatus {
  return (MAINTENANCE_ORDER_STATUSES as readonly string[]).includes(value);
}

export function isMaintenanceRoomImpact(value: string): value is MaintenanceRoomImpact {
  return (MAINTENANCE_ROOM_IMPACTS as readonly string[]).includes(value);
}

/**
 * Resolving a work order only closes it. It never restores sellable availability:
 * OOO/OOS release, HK readiness and ATS recalculation happen outside this module.
 */
export function resolveMaintenanceOrder(order: MaintenanceOrder): MaintenanceOrder {
  if (order.status === "RESOLVED") {
    return order;
  }

  return {
    ...order,
    status: "RESOLVED",
    roomImpact: order.roomImpact,
    history: [...order.history, { status: "RESOLVED", note: null, actorReference: null }],
  };
}
