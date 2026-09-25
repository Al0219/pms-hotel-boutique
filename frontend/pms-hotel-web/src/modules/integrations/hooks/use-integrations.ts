"use client";

import { useQuery } from "@tanstack/react-query";

import { mapIntegration } from "../mappers/integration.mapper";
import { listIntegrations } from "../service/integration.service";

export function useIntegrations(propertyId: string | undefined, endpoint: string | undefined) {
  return useQuery({
    queryKey: ["integrations", propertyId, endpoint],
    enabled: Boolean(propertyId && endpoint),
    queryFn: async ({ signal }) => {
      if (!propertyId || !endpoint) {
        throw new Error("INTEGRATION_QUERY_CONFIGURATION_REQUIRED");
      }

      const response = await listIntegrations({ endpoint, propertyId, signal });
      return response.integrations.map(mapIntegration);
    },
  });
}
