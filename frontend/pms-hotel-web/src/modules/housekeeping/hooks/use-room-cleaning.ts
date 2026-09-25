"use client";

import { useQuery } from "@tanstack/react-query";

import { mapRoomCleaning } from "../mappers/room-cleaning.mapper";
import { listRoomCleaning } from "../service/room-cleaning.service";

export function useRoomCleaning(propertyId: string | undefined, endpoint: string | undefined) {
  return useQuery({
    queryKey: ["room-cleaning", propertyId, endpoint],
    enabled: Boolean(propertyId && endpoint),
    queryFn: async ({ signal }) => {
      if (!propertyId || !endpoint) {
        throw new Error("HOUSEKEEPING_QUERY_CONFIGURATION_REQUIRED");
      }

      const response = await listRoomCleaning({ endpoint, propertyId, signal });
      return response.rooms.map(mapRoomCleaning);
    },
  });
}
