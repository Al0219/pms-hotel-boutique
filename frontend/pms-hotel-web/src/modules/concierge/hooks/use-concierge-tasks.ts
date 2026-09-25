"use client";

import { useQuery } from "@tanstack/react-query";

import { mapConciergeTask } from "../mappers/concierge-task.mapper";
import { listConciergeTasks } from "../service/concierge-task.service";

export function useConciergeTasks(propertyId: string | undefined, endpoint: string | undefined) {
  return useQuery({
    queryKey: ["concierge-tasks", propertyId, endpoint],
    enabled: Boolean(propertyId && endpoint),
    queryFn: async ({ signal }) => {
      if (!propertyId || !endpoint) {
        throw new Error("CONCIERGE_QUERY_CONFIGURATION_REQUIRED");
      }

      const response = await listConciergeTasks({ endpoint, propertyId, signal });
      return response.tasks.map(mapConciergeTask);
    },
  });
}
