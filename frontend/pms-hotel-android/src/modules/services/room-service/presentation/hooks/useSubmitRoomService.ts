import { useMutation } from '@tanstack/react-query';

import { MockRoomServiceService } from '@/modules/services/room-service/data/mocks/MockRoomServiceService';
import { type RoomServiceService } from '@/modules/services/room-service/data/services/RoomServiceService';
import { type RoomServiceRequest } from '@/modules/services/room-service/domain/models/RoomServiceRequest';

const defaultRoomService: RoomServiceService = new MockRoomServiceService();

export function useSubmitRoomService(service: RoomServiceService = defaultRoomService) {
  return useMutation({
    mutationFn: (request: RoomServiceRequest) => service.submitRequest(request),
    retry: false,
  });
}
