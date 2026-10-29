import { type HousekeepingRequest } from '@/modules/services/housekeeping/domain/HousekeepingRequest';
import { type ActiveReservationContext } from '@/modules/guest-auth/domain/models/ActiveReservationContext';
import { type HousekeepingRequestDto } from '../dtos/HousekeepingRequestDto';

export interface HousekeepingService {
  submitRequest(input: HousekeepingRequest, context?: ActiveReservationContext, requestKey?: string): Promise<HousekeepingRequestDto | void>;
  updateRequest?(input: HousekeepingRequest, context: ActiveReservationContext, requestId: string, expectedUpdatedAt: string): Promise<HousekeepingRequestDto>;
  cancelRequest?(context: ActiveReservationContext, requestId: string, expectedUpdatedAt: string): Promise<HousekeepingRequestDto>;
  listRequests?(context: ActiveReservationContext): Promise<HousekeepingRequestDto[]>;
}
