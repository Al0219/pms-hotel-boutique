export type StayLifecycleAction = 'check-in' | 'check-out';
export interface StayLifecycleScope {
  propertyId: string;
  reservationId: string;
  stayId: string;
}
export interface StayLifecycleExpectation {
  expectedStatus: 'RESERVED' | 'IN_HOUSE';
  expectedUpdatedAt: string;
  expectedRoomId: string | null;
}
export interface StayLifecycleReceipt extends StayLifecycleScope {
  operationId: string;
  status: 'IN_HOUSE' | 'CHECKED_OUT';
  completedAt: string;
}
