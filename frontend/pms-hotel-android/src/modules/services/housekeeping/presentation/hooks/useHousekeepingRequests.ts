import { useGuestServiceRequests } from '@/modules/service-requests';
import { environment } from '@/config/environment';
import { DomainMappingError } from '@/domain/errors/DomainMappingError';
import { useActiveReservationContext } from '@/modules/guest-auth/presentation/ActiveReservationContextProvider';
import { useGuestAuthSession } from '@/modules/guest-auth/presentation/GuestAuthSessionProvider';
import { mapHousekeepingRequestDto } from '../../data/mappers/mapHousekeepingRequestDto';
import { housekeepingService } from '../../data/services/housekeepingServices';
import { type HousekeepingService } from '../../data/services/HousekeepingService';

export function useHousekeepingRequests(service: HousekeepingService = housekeepingService) {
  const { session, sessionExpired } = useGuestAuthSession();
  const { activeReservationContext: context } = useActiveReservationContext();
  const enabled = !environment.useMockApi && !!session?.accountId && !sessionExpired && !!context;
  return useGuestServiceRequests({ queryKey: ['guest-housekeeping', session?.accountId, context?.reservationId, context?.reservationStayId],
    enabled,
    queryFn: async () => {
      if (!context || !service.listRequests) throw new Error('Housekeeping context unavailable');
      const dtos = await service.listRequests(context);
      if (!Array.isArray(dtos)) throw new DomainMappingError('housekeepingRequests');
      return dtos.map(dto => mapHousekeepingRequestDto(dto, context));
    },
  });
}
