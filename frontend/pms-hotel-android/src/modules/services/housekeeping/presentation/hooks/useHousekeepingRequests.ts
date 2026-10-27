import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
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
  const { session, sessionExpired } = useGuestAuthSession();
  const [focused, setFocused] = useState(false);
  const [foreground, setForeground] = useState(() => AppState.currentState === 'active');
  useEffect(() => {
    if (environment.useMockApi) return;
    const subscription = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => subscription.remove();
  }, []);
  const { activeReservationContext: context } = useActiveReservationContext();
  const enabled = !environment.useMockApi && !!session?.accountId && !sessionExpired && !!context;
  const query = useQuery({ queryKey: ['guest-housekeeping', session?.accountId, context?.reservationId, context?.reservationStayId],
    enabled, retry: false, staleTime: 0,
    refetchIntervalInBackground: false,
    refetchInterval: current => enabled && focused && foreground
      // Pause every observer's interval during a shared fetch, then restart from its result.
      // Account and My services therefore share one cadence as well as one query/promise.
      && current.state.fetchStatus === 'idle'
      && current.state.data?.some(request => request.status === 'OPEN' || request.status === 'IN_PROGRESS')
      ? 10_000 : false,
    queryFn: async () => {
      if (!context || !service.listRequests) throw new Error('Housekeeping context unavailable');
      const dtos = await service.listRequests(context);
      if (!Array.isArray(dtos)) throw new DomainMappingError('housekeepingRequests');
      return dtos.map(dto => mapHousekeepingRequestDto(dto, context));
    },
  });
  const { refetch } = query;
  useFocusEffect(useCallback(() => {
    setFocused(true);
    // Foreground changes rerun this focused effect, including when returning from Staff/other apps.
    if (enabled && foreground) void refetch({ cancelRefetch: false });
    return () => setFocused(false);
  }, [enabled, foreground, refetch]));
  return query;
}
