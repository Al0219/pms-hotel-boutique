import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { environment } from '@/config/environment';
import { useActiveReservationContext } from '@/modules/guest-auth/presentation/ActiveReservationContextProvider';
import { mapHousekeepingRequestDto } from '../../data/mappers/mapHousekeepingRequestDto';
import { housekeepingService } from '../../data/services/housekeepingServices';
import { type HousekeepingService } from '../../data/services/HousekeepingService';
import { type HousekeepingRequest } from '../../domain/HousekeepingRequest';

export function useSubmitHousekeeping(service: HousekeepingService = housekeepingService) {
  const { activeReservationContext: context } = useActiveReservationContext();
  const queries = useQueryClient();
  const intent = useRef<{ signature: string; key: string } | null>(null);
  return useMutation({
    mutationFn: async (input: HousekeepingRequest) => {
      if (environment.useMockApi) return service.submitRequest(input);
      if (!context) throw new Error('Select a stay');
      const signature = JSON.stringify([context, input]);
      if (intent.current?.signature !== signature) intent.current = { signature,
        key: `hk-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}` };
      const dto = await service.submitRequest(input, context, intent.current.key);
      if (!dto) throw new Error('Missing persisted housekeeping confirmation');
      return mapHousekeepingRequestDto(dto, context);
    },
    onSuccess: async () => { if (!environment.useMockApi) await queries.invalidateQueries({ queryKey: ['guest-housekeeping'] }); },
    retry: false,
  });
}
