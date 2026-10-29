import { type RoomServiceMenu } from '@/modules/services/room-service/domain/models/RoomServiceMenu';
import { type RoomServiceRequest } from '@/modules/services/room-service/domain/models/RoomServiceRequest';

import type { ActiveReservationContext } from '@/modules/guest-auth/domain/models/ActiveReservationContext';
import type { RoomServiceProductDto, RoomServiceOrderDto } from '../dtos/RoomServiceDto';
/** Mock compatibility plus the authenticated native transport boundary. */
export interface RoomServiceService {
  getMenu(context?: ActiveReservationContext): Promise<RoomServiceMenu | RoomServiceProductDto[]>;
  submitRequest(request: RoomServiceRequest, context?: ActiveReservationContext, key?: string): Promise<void | RoomServiceOrderDto>;
  listOrders?(context: ActiveReservationContext): Promise<RoomServiceOrderDto[]>;
  updateOrder?(request: RoomServiceRequest, context: ActiveReservationContext, id: string, expectedUpdatedAt: string): Promise<RoomServiceOrderDto>;
  cancelOrder?(context: ActiveReservationContext, id: string, expectedUpdatedAt: string): Promise<RoomServiceOrderDto>;
}
