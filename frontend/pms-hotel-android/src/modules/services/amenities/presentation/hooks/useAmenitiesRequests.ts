import { useGuestServiceRequests } from '@/modules/service-requests';
import { environment } from '@/config/environment';
import { useGuestAuthSession } from '@/modules/guest-auth/presentation/GuestAuthSessionProvider';
import { useActiveReservationContext } from '@/modules/guest-auth/presentation/ActiveReservationContextProvider';
import { mapAmenitiesRequest } from '../../data/mappers/mapAmenitiesDto';
import { amenitiesService } from '../../data/services/amenitiesServices';
import type { AmenitiesService } from '../../data/services/AmenitiesService';
export function useAmenitiesRequests(service:AmenitiesService=amenitiesService, enabled=true) {
  const {session,sessionExpired}=useGuestAuthSession();const {activeReservationContext:context}=useActiveReservationContext();
  return useGuestServiceRequests({queryKey:['guest-amenities',session?.accountId,context?.reservationId,context?.reservationStayId],
    enabled:enabled&&!environment.useMockApi&&!!session&&!sessionExpired&&!!context,
    queryFn:async()=>{if(!context||!service.listRequests)throw new Error('Real orders unavailable');const rows=await service.listRequests(context);if(!Array.isArray(rows))throw new Error('Invalid room service list');return rows.map(row=>mapAmenitiesRequest(row,context));}});
}
