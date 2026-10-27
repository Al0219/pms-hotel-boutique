import { useQuery } from '@tanstack/react-query';
import { environment } from '@/config/environment';
import { useGuestAuthSession } from '@/modules/guest-auth/presentation/GuestAuthSessionProvider';
import { useActiveReservationContext } from '@/modules/guest-auth/presentation/ActiveReservationContextProvider';
import { amenitiesCatalogFixture } from '../../data/mocks/amenitiesCatalogFixture';
import { mapAmenitiesCatalog } from '../../data/mappers/mapAmenitiesDto';
import { amenitiesService } from '../../data/services/amenitiesServices';
import type { AmenitiesService } from '../../data/services/AmenitiesService';
function useMockCatalog() { return useQuery({queryKey:['amenities','mock-catalog'],queryFn:async()=>amenitiesCatalogFixture,retry:false,initialData:amenitiesCatalogFixture}); }
function useRealCatalog(service: AmenitiesService = amenitiesService) {
  const {session,sessionExpired}=useGuestAuthSession(); const {activeReservationContext:context}=useActiveReservationContext();
  return useQuery({queryKey:['amenities','catalog',session?.accountId,context?.reservationId,context?.reservationStayId],
    enabled:!!session&&!sessionExpired&&!!context,retry:false,
    queryFn:async()=>{if(!context||!service.getCatalog)throw new Error('Catalog unavailable'); return mapAmenitiesCatalog(await service.getCatalog(context));}});
}
export function useAmenitiesCatalog(service?: AmenitiesService) { const useCatalog=environment.useMockApi?useMockCatalog:useRealCatalog; return useCatalog(service); }
