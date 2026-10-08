import { type RoomServiceMenu } from '@/modules/services/room-service/domain/models/RoomServiceMenu';
import { type RoomServiceRequest } from '@/modules/services/room-service/domain/models/RoomServiceRequest';

/** Cohesive frontend-first boundary; no HTTP, persistence or order lifecycle. */
export interface RoomServiceService {
  getMenu(): Promise<RoomServiceMenu>;
  submitRequest(request: RoomServiceRequest): Promise<void>;
}
