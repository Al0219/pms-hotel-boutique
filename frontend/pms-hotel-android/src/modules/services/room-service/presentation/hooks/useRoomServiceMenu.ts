import { useQuery } from '@tanstack/react-query';

import { MockRoomServiceService } from '@/modules/services/room-service/data/mocks/MockRoomServiceService';
import { type RoomServiceService } from '@/modules/services/room-service/data/services/RoomServiceService';

export const roomServiceMenuQueryKey = ['room-service', 'menu'] as const;

const defaultRoomService: RoomServiceService = new MockRoomServiceService();

export function useRoomServiceMenu(service: RoomServiceService = defaultRoomService) {
  return useQuery({
    queryKey: roomServiceMenuQueryKey,
    queryFn: () => service.getMenu(),
    retry: false,
  });
}
