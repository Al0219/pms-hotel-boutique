"use client";

import { useQuery } from "@tanstack/react-query";
import { DomainMappingError } from '@/lib/errors';

import { mapRoom } from "../mappers/room.mapper";
import { listRooms } from "../service/room.service";
import { readStaffInventory, staffRoomsEndpoint } from '../service/staff-inventory-read.service';
import { mapStaffRooms } from '../mappers/staff-inventory.mapper';

export function useRooms(propertyId: string | undefined, endpoint: string | undefined, sessionId?: string) {
  return useQuery({
    queryKey: ["rooms", propertyId, endpoint, ...(endpoint === staffRoomsEndpoint ? [sessionId] : [])],
    enabled: Boolean(propertyId && endpoint),
    queryFn: async ({ signal }) => {
      if (!propertyId || !endpoint) {
        throw new Error("ROOMS_QUERY_CONFIGURATION_REQUIRED");
      }

      if (endpoint === staffRoomsEndpoint) return mapStaffRooms(await readStaffInventory(propertyId, signal), propertyId);
      const response = await listRooms({ endpoint, propertyId, signal });
      const rooms = response.rooms.map(mapRoom);
      if (rooms.some(room => room.propertyId !== propertyId)) throw new DomainMappingError('ROOM_PROPERTY_MISMATCH');
      return rooms;
    },
  });
}
