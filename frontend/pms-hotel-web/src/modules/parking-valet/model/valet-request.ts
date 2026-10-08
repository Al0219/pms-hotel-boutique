export const VALET_REQUEST_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED"] as const;

export type ValetRequestStatus = (typeof VALET_REQUEST_STATUSES)[number];

export const VALET_REQUEST_TYPES = ["PARKING", "VALET_IN", "VALET_OUT"] as const;

export type ValetRequestRequestType = (typeof VALET_REQUEST_TYPES)[number];

export interface ValetRequest {
  id: string;
  propertyId: string;
  guestName: string;
  vehicleDescription: string;
  requestType: ValetRequestRequestType;
  status: ValetRequestStatus;
  parkingSpace: string | null;
  notes: string | null;
}

export function isValetRequestStatus(value: string): value is ValetRequestStatus {
  return (VALET_REQUEST_STATUSES as readonly string[]).includes(value);
}

export function isValetRequestRequestType(value: string): value is ValetRequestRequestType {
  return (VALET_REQUEST_TYPES as readonly string[]).includes(value);
}
