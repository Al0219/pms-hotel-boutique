import { withRoomServiceSnapshotPrices } from '../../domain/models/RoomServiceCart';
import type { PersistedRoomServiceOrder } from '../../domain/models/PersistedRoomServiceOrder';
import { useQuery } from '@tanstack/react-query';
import { environment } from '@/config/environment';
import { useGuestAuthSession } from '@/modules/guest-auth/presentation/GuestAuthSessionProvider';
import { useActiveReservationContext } from '@/modules/guest-auth/presentation/ActiveReservationContextProvider';
import { mapRoomServiceMenu } from '../../data/mappers/mapRoomServiceDto';
import { roomServiceService } from '../../data/services/roomServiceServices';
import type { RoomServiceService } from '../../data/services/RoomServiceService';
import type { RoomServiceMenu } from '../../domain/models/RoomServiceMenu';
import type { RoomServiceProductDto } from '../../data/dtos/RoomServiceDto';
export const roomServiceMenuQueryKey = ['room-service','menu'] as const;
function useRealRoomServiceMenu(service: RoomServiceService = roomServiceService,editing?:PersistedRoomServiceOrder) {
  const {session,sessionExpired}=useGuestAuthSession();const {activeReservationContext:context}=useActiveReservationContext();
  return useQuery({ queryKey:environment.useMockApi ? roomServiceMenuQueryKey : [...roomServiceMenuQueryKey,session?.accountId,context?.reservationId,context?.reservationStayId],
    select:menu=>editing?withRoomServiceSnapshotPrices(menu,editing.items):menu,
    enabled:environment.useMockApi || !!session && !sessionExpired && !!context,retry:false,
    queryFn:async()=>{ const value=await service.getMenu(context??undefined);return environment.useMockApi ? value as RoomServiceMenu : mapRoomServiceMenu(value as RoomServiceProductDto[]); },
  });
}

function useMockRoomServiceMenu(service:RoomServiceService=roomServiceService) {
  return useQuery({queryKey:roomServiceMenuQueryKey,queryFn:async()=>await service.getMenu() as RoomServiceMenu,retry:false});
}
export function useRoomServiceMenu(service?:RoomServiceService,editing?:PersistedRoomServiceOrder) {
 const useMenu=environment.useMockApi?useMockRoomServiceMenu:useRealRoomServiceMenu;
 return useMenu(service,editing);
}
