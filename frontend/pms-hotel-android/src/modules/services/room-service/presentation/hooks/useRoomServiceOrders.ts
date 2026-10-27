import { useGuestServiceRequests } from '@/modules/service-requests';
import { environment } from '@/config/environment';
import { useGuestAuthSession } from '@/modules/guest-auth/presentation/GuestAuthSessionProvider';
import { useActiveReservationContext } from '@/modules/guest-auth/presentation/ActiveReservationContextProvider';
import { mapRoomServiceOrder } from '../../data/mappers/mapRoomServiceDto';
import { roomServiceService } from '../../data/services/roomServiceServices';
import type { RoomServiceService } from '../../data/services/RoomServiceService';
export function useRoomServiceOrders(service:RoomServiceService=roomServiceService) {
  const {session,sessionExpired}=useGuestAuthSession();const {activeReservationContext:context}=useActiveReservationContext();
  return useGuestServiceRequests({queryKey:['guest-room-service',session?.accountId,context?.reservationId,context?.reservationStayId],
    enabled:!environment.useMockApi&&!!session&&!sessionExpired&&!!context,
    queryFn:async()=>{if(!context||!service.listOrders)throw new Error('Real orders unavailable');const rows=await service.listOrders(context);if(!Array.isArray(rows))throw new Error('Invalid room service list');return rows.map(row=>mapRoomServiceOrder(row,context));}});
}
