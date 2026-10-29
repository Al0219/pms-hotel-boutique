import type { AmenitiesRequest } from '../../domain/AmenitiesRequest';
import type { ActiveReservationContext } from '@/modules/guest-auth/domain/models/ActiveReservationContext';
import type { AmenityCatalogDto, AmenitiesRequestDto } from '../dtos/AmenitiesDto';
export interface AmenitiesService {
  submitRequest(input: AmenitiesRequest, context?: ActiveReservationContext, key?: string): Promise<void | AmenitiesRequestDto>;
  getCatalog?(context: ActiveReservationContext): Promise<AmenityCatalogDto[]>;
  listRequests?(context: ActiveReservationContext): Promise<AmenitiesRequestDto[]>;
  updateRequest?(input: AmenitiesRequest, context: ActiveReservationContext, id: string, expectedUpdatedAt: string): Promise<AmenitiesRequestDto>;
  cancelRequest?(context: ActiveReservationContext, id: string, expectedUpdatedAt: string): Promise<AmenitiesRequestDto>;
}
