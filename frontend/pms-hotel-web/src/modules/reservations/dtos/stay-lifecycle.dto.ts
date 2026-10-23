export interface StayLifecycleResultDto {
  operationId: string;
  propertyId: string;
  reservationId: string;
  stayId: string;
  status: 'IN_HOUSE' | 'CHECKED_OUT';
  completedAt: string;
}
