import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { environment } from '@/config/environment';
import { DomainMappingError } from '@/domain/errors/DomainMappingError';
import { useActiveReservationContext } from '@/modules/guest-auth/presentation/ActiveReservationContextProvider';
import { useGuestAuthSession } from '@/modules/guest-auth/presentation/GuestAuthSessionProvider';
import { mapHousekeepingRequestDto } from '../../data/mappers/mapHousekeepingRequestDto';
import { housekeepingService } from '../../data/services/housekeepingServices';
import { type HousekeepingService } from '../../data/services/HousekeepingService';

export function useHousekeepingRequests(service: HousekeepingService = housekeepingService) {
  const { session } = useGuestAuthSession();
  const { activeReservationContext: context } = useActiveReservationContext();
  const enabled = !environment.useMockApi && !!session && !!context;
  const query = useQuery({ queryKey: ['guest-housekeeping', session?.accountId, context?.reservationId, context?.reservationStayId],
    enabled, retry: false, staleTime: 0,
    queryFn: async () => {
      if (!context || !service.listRequests) throw new Error('Housekeeping context unavailable');
      const dtos = await service.listRequests(context);
      if (!Array.isArray(dtos)) throw new DomainMappingError('housekeepingRequests');
      return dtos.map(dto => mapHousekeepingRequestDto(dto, context));
    },
  });
  const { refetch } = query;
  useFocusEffect(useCallback(() => { if (enabled) void refetch({ cancelRefetch: false }); }, [enabled, refetch]));
  return query;
}
