import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { environment } from '@/config/environment';
import { useActiveReservationContext } from '@/modules/guest-auth/presentation/ActiveReservationContextProvider';
import { mapHousekeepingRequestDto } from '../../data/mappers/mapHousekeepingRequestDto';
import { housekeepingService } from '../../data/services/housekeepingServices';
import { type HousekeepingService } from '../../data/services/HousekeepingService';
import { type HousekeepingRequest } from '../../domain/HousekeepingRequest';

export function useSubmitHousekeeping(service: HousekeepingService = housekeepingService, editing?: { id: string; updatedAt: string }) {
  const { activeReservationContext: context } = useActiveReservationContext();
  const queries = useQueryClient();
  const intent = useRef<{ signature: string; key: string } | null>(null);
  return useMutation({
    mutationFn: async (input: HousekeepingRequest) => {
      if (environment.useMockApi) return service.submitRequest(input);
      if (!context) throw new Error('Select a stay');
      if (editing) {
        if (!service.updateRequest) throw new Error('Real edit unavailable');
        const saved = mapHousekeepingRequestDto(await service.updateRequest(input, context, editing.id, editing.updatedAt), context);
        if (saved.id !== editing.id) throw new Error('Unexpected request identity');
        return saved;
      }
      const signature = JSON.stringify([context, input]);
      if (intent.current?.signature !== signature) intent.current = { signature,
        key: `hk-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}` };
      const dto = await service.submitRequest(input, context, intent.current.key);
      if (!dto) throw new Error('Missing persisted housekeeping confirmation');
      return mapHousekeepingRequestDto(dto, context);
    },
    onSuccess: async () => { if (!environment.useMockApi) await queries.invalidateQueries({ queryKey: ['guest-housekeeping'] }); },
    onError: async () => { if (!environment.useMockApi && editing) await queries.invalidateQueries({ queryKey: ['guest-housekeeping'] }); },
    retry: false,
  });
}
