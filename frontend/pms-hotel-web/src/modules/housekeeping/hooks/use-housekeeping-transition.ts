import { useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transitionGuestCleaningRequest } from '../service/guest-cleaning-requests.service';
import { projectHousekeepingTransition } from '../mappers/guest-cleaning-request.mapper';
import type { HousekeepingTransitionTarget, HousekeepingTransition } from '../model/guest-cleaning-request';

export function useHousekeepingTransition(propertyId: string, sessionId: string) {
  const queries = useQueryClient();
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), [propertyId, sessionId]);
  return useMutation({ retry: false,
    mutationFn: async (input: { id: string; expectedUpdatedAt: string; targetStatus: HousekeepingTransitionTarget }): Promise<HousekeepingTransition> => {
      const controller = new AbortController();pending.current = controller;
      try {
        const dto = await transitionGuestCleaningRequest(propertyId, input.id, input.expectedUpdatedAt, input.targetStatus, controller.signal);
        if (controller.signal.aborted) throw new Error('HOUSEKEEPING_CONTEXT_CHANGED');
        return projectHousekeepingTransition(dto, propertyId, input.id, input.targetStatus);
      } finally { if (pending.current === controller) pending.current = null; }
    },
    onSettled: async () => { await queries.invalidateQueries({ queryKey: ['staff-guest-cleaning-requests', sessionId, propertyId], exact: true }); },
  });
}
