/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 */
export interface MaintenanceOrderEventDto {
  /** One of OPEN | IN_PROGRESS | RESOLVED. */
  status: string;
  note: string | null;
  actor_reference: string | null;
}

/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 */
export interface MaintenanceOrderDto {
  order_id: string;
  property_id: string;
  room_id: string;
  title: string;
  /** One of OPEN | IN_PROGRESS | RESOLVED. */
  status: string;
  /** One of NONE | OOO | OOS. */
  room_impact: string;
  history: MaintenanceOrderEventDto[];
}

/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 */
export interface MaintenanceOrderListDto {
  orders: MaintenanceOrderDto[];
}
