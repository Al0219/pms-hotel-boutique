/** Session-only presentation data. It does not represent a Backend request. */
export type SessionServiceRequestKind =
  | 'HOUSEKEEPING'
  | 'ROOM_SERVICE'
  | 'VEHICLE_REQUEST'
  | 'TRANSFER'
  | 'AMENITIES'
  | 'LATE_CHECKOUT'
  | 'HOTEL_ASSIGNED';

export type SessionServiceRequestOrigin = 'SERVICES' | 'VALET' | 'CHAT';

export type SessionServiceRequestStatus = 'REQUESTED' | 'ASSIGNED' | 'COMPLETED';

export interface SessionServiceRequest {
  sessionRequestId: string;
  kind: SessionServiceRequestKind;
  origin: SessionServiceRequestOrigin;
  title: string;
  summary?: string;
  status: SessionServiceRequestStatus;
  /** Session-only timestamp used exclusively to order the local list. */
  createdAtMs: number;
  details?: SessionServiceRequestDetails;
}

export type SessionServiceRequestDetails =
  | { type: 'ROOM_SERVICE'; items: readonly { itemFixtureKey: string; quantity: number }[]; deliveryTime: string; serviceDate?: string; notes?: string }
  | { type: 'HOUSEKEEPING'; cleaningType: string; timeSlot: string; serviceDate?: string; notes?: string }
  | { type: 'VEHICLE_REQUEST'; sessionVehicleId: string; requestedTime: string; serviceDate?: string }
  | { type: 'LATE_CHECKOUT'; serviceDate: string; checkoutUntil: string }
  | { type: 'HOTEL_ASSIGNED' }
  | { type: 'TRANSFER'; destinationKey: string; pickupKey?: string; scheduledAtMs: number; passengers: number }
  | { type: 'AMENITIES'; serviceDate: string; deliveryTime: string; items: readonly { itemFixtureKey: string; quantity: number }[]; notes?: string };

export interface AddSessionServiceRequestInput {
  kind: SessionServiceRequestKind;
  origin: SessionServiceRequestOrigin;
  title: string;
  summary?: string;
  status: SessionServiceRequestStatus;
  /** Local idempotency key, useful for structured Chat assignments. */
  dedupeKey?: string;
  details?: SessionServiceRequestDetails;
}
