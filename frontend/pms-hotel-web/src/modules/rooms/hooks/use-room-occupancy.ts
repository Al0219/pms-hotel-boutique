'use client';
import { useQuery } from '@tanstack/react-query';
import { getPublicEnvironment } from '@/lib/env';
import { mapRoomOccupancy } from '../mappers/room-occupancy.mapper';
import { isOccupancyDay } from '../model/room-occupancy';
import { readRoomOccupancy } from '../service/room-occupancy.service';
import { mapStaffRoomOccupancy } from '../mappers/staff-room-occupancy.mapper';
import type { Room } from '../model/room';
import type { RoomOccupancySource, RoomOccupancySnapshot } from '../model/room-occupancy';

export function useRoomOccupancy(propertyId?: string, sessionId?: string, date = '', enabled = true,
  rooms?: readonly Room[], source?: RoomOccupancySource) {
  const mock = getPublicEnvironment().useMockApi;
  const query = useQuery({ queryKey: ['staff-room-occupancy', sessionId, propertyId, date],
    enabled: mock && enabled && !!propertyId && !!sessionId && isOccupancyDay(date), retry: false, staleTime: 0,
    queryFn: async ({ signal }) => {
      if (!propertyId) throw new Error('ROOM_OCCUPANCY_SCOPE_REQUIRED');
      return mapRoomOccupancy(await readRoomOccupancy(propertyId, date, signal), propertyId, date);
    } });
  if (mock) return { connected: true, query };
  let data: RoomOccupancySnapshot | undefined;
  let error = source?.error ?? null;
  if (enabled && propertyId && rooms && source?.isSuccess && !source.isError && source.data && isOccupancyDay(date)) {
    try { data = mapStaffRoomOccupancy(rooms, source.data, propertyId, date); }
    catch (failure) { error = failure instanceof Error ? failure : new Error('INVALID_ROOM_OCCUPANCY'); }
  }
  return { connected: !!source, query: { data, error, isSuccess: !!data && !error, isError: !!error,
    isFetching: source?.isFetching ?? false, refetch: source?.refetch ?? (() => undefined) } };
}
