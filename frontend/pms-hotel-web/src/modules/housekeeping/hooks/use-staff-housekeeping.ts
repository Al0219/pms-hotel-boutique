'use client';
import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mapStaffHousekeepingBoard, mapStaffHousekeepingRoom } from '../mappers/staff-housekeeping.mapper';
import { readStaffHousekeeping, changeStaffHousekeeping } from '../service/staff-housekeeping.service';
import type { HousekeepingChange } from '../model/staff-housekeeping';

export function useStaffHousekeeping(propertyId: string, sessionId: string) {
  const client = useQueryClient();
  const pending = useRef<AbortController | null>(null);
  const active = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; pending.current?.abort(); }; }, [propertyId, sessionId]);
  const key = ['staff-housekeeping', sessionId, propertyId];
  const query = useQuery({ queryKey: key, enabled: !!propertyId && !!sessionId, retry: false,
    queryFn: async ({ signal }) => mapStaffHousekeepingBoard(await readStaffHousekeeping(propertyId, signal), propertyId) });
  const mutation = useMutation({ retry: false,
    mutationFn: async (change: HousekeepingChange) => {
      const controller = new AbortController(); pending.current = controller;
      try {
        const dto = await changeStaffHousekeeping(propertyId, change, controller.signal);
        if (controller.signal.aborted) throw new Error('HOUSEKEEPING_CONTEXT_CHANGED');
        return mapStaffHousekeepingRoom(dto, propertyId, change.room.roomId);
      } finally { if (pending.current === controller) pending.current = null; }
    },
    onSuccess: async () => { if (active.current) await client.invalidateQueries({ queryKey: key, exact: true }); },
  });
  return { query, mutation };
}
