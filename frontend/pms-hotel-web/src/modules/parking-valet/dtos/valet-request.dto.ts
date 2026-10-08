/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 * This queue is internal: operations handles valet requests, no direct guest messaging.
 */
export interface ValetRequestDto {
  request_id: string;
  property_id: string;
  guest_name: string;
  vehicle_description: string;
  /** One of PARKING | VALET_IN | VALET_OUT. */
  request_type: string;
  /** One of PENDING | IN_PROGRESS | COMPLETED. */
  status: string;
  /** Assigned parking space identifier. Null when not yet assigned. */
  parking_space: string | null;
  /** Free-form operational notes. Null when absent. */
  notes: string | null;
}

/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 */
export interface ValetRequestListDto {
  requests: ValetRequestDto[];
}
