import { type ReservationAccessRequest, type ReservationAccessResult } from '@/modules/access/domain/models/ReservationAccess';

export interface AccessService {
  linkReservation(request: ReservationAccessRequest): Promise<ReservationAccessResult>;
}
