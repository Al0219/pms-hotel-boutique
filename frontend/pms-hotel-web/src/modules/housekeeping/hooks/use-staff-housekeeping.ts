'use client';
import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mapStaffHousekeepingBoard, mapStaffHousekeepingRoom } from '../mappers/staff-housekeeping.mapper';
import { readStaffHousekeeping, changeStaffHousekeeping } from '../service/staff-housekeeping.service';
import type { HousekeepingChange } from '../model/staff-housekeeping';

/** Read-only composition port for Reception's room board; no mutation capability. */
export function useStaffHousekeepingRooms(propertyId: string, sessionId: string, enabled = true, autoRefresh = true) {
  return useQuery({ queryKey: ['staff-housekeeping', sessionId, propertyId],
    enabled: enabled && !!propertyId && !!sessionId, retry: false, staleTime: 0,
    refetchInterval: autoRefresh ? 30_000 : false, refetchOnWindowFocus: autoRefresh ? 'always' : false,
    queryFn: async ({ signal }) => mapStaffHousekeepingBoard(await readStaffHousekeeping(propertyId, signal), propertyId) });
}

export function useStaffHousekeeping(propertyId: string, sessionId: string, editing = false) {
  const client = useQueryClient();
  const pending = useRef<AbortController | null>(null);
  const active = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; pending.current?.abort(); }; }, [propertyId, sessionId]);
  const key = ['staff-housekeeping', sessionId, propertyId];
  const query = useStaffHousekeepingRooms(propertyId, sessionId, true, !editing);
  const mutation = useMutation({ retry: false,
    mutationFn: async (change: HousekeepingChange) => {
      const controller = new AbortController(); pending.current = controller;
      try {
        const dto = await changeStaffHousekeeping(propertyId, change, controller.signal);
        if (controller.signal.aborted) throw new Error('HOUSEKEEPING_CONTEXT_CHANGED');
        return mapStaffHousekeepingRoom(dto, propertyId, change.room.roomId);
      } finally { if (pending.current === controller) pending.current = null; }
    },
    onSuccess: async () => { if (active.current) await Promise.all([
      client.invalidateQueries({ queryKey: key, exact: true }),
      client.invalidateQueries({ queryKey: ['staff-room-assignment', sessionId, propertyId] }),
    ]); },
  });
  return { query, mutation };
}
