"use client";

import { useQuery } from "@tanstack/react-query";

import { mapAgency } from "../mappers/agency.mapper";
import { listAgencies } from "../service/agency.service";

export function useAgencies(propertyId: string | undefined, endpoint: string | undefined) {
  return useQuery({
    queryKey: ["agencies", propertyId, endpoint],
    enabled: Boolean(propertyId && endpoint),
    queryFn: async ({ signal }) => {
      if (!propertyId || !endpoint) {
        throw new Error("AGENCY_QUERY_CONFIGURATION_REQUIRED");
      }

      const response = await listAgencies({ endpoint, propertyId, signal });
      return response.agencies.map(mapAgency);
    },
  });
}
