"use client";

import { useQuery } from "@tanstack/react-query";

import { mapGroup } from "../mappers/group.mapper";
import { listGroups } from "../service/group.service";

export function useGroups(propertyId: string | undefined, endpoint: string | undefined) {
  return useQuery({
    queryKey: ["groups", propertyId, endpoint],
    enabled: Boolean(propertyId && endpoint),
    queryFn: async ({ signal }) => {
      if (!propertyId || !endpoint) {
        throw new Error("GROUP_QUERY_CONFIGURATION_REQUIRED");
      }

      const response = await listGroups({ endpoint, propertyId, signal });
      return response.groups.map(mapGroup);
    },
  });
}
