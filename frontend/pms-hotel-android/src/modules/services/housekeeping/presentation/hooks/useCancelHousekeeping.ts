import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useActiveReservationContext } from '@/modules/guest-auth/presentation/ActiveReservationContextProvider';
import { mapHousekeepingRequestDto } from '../../data/mappers/mapHousekeepingRequestDto';
import { housekeepingService } from '../../data/services/housekeepingServices';
import { type HousekeepingService } from '../../data/services/HousekeepingService';
import { type PersistedHousekeepingRequest } from '../../domain/PersistedHousekeepingRequest';

export function useCancelHousekeeping(service: HousekeepingService = housekeepingService) {
  const { activeReservationContext: context } = useActiveReservationContext();
  const queries = useQueryClient();
  return useMutation({ retry: false,
    mutationFn: async (request: PersistedHousekeepingRequest) => {
      if (!context || !service.cancelRequest || request.reservationId !== context.reservationId || request.stayId !== context.reservationStayId) throw new Error('Invalid cancellation context');
      const saved = mapHousekeepingRequestDto(await service.cancelRequest(context, request.id, request.updatedAt), context);
      if (saved.id !== request.id || saved.status !== 'CANCELLED') throw new Error('Missing persisted cancellation');
      return saved;
    },
    onSettled: async () => { await queries.invalidateQueries({ queryKey: ['guest-housekeeping'] }); },
  });
}
