"use client";

import { useQuery } from "@tanstack/react-query";

import { mapValetRequest } from "../mappers/valet-request.mapper";
import { listValetRequests } from "../service/valet-request.service";

export function useValetRequests(propertyId: string | undefined, endpoint: string | undefined) {
  return useQuery({
    queryKey: ["valet-requests", propertyId, endpoint],
    enabled: Boolean(propertyId && endpoint),
    queryFn: async ({ signal }) => {
      if (!propertyId || !endpoint) {
        throw new Error("VALET_QUERY_CONFIGURATION_REQUIRED");
      }

      const response = await listValetRequests({ endpoint, propertyId, signal });
      return response.requests.map(mapValetRequest);
    },
  });
}
