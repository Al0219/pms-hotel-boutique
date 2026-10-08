"use client";

import { useQuery } from "@tanstack/react-query";

import { mapPropertyReport } from "../mappers/property-report.mapper";
import { listPropertyReports } from "../service/property-report.service";

export function usePropertyReports(propertyId: string | undefined, endpoint: string | undefined) {
  return useQuery({
    queryKey: ["propertyReports", propertyId, endpoint],
    enabled: Boolean(propertyId && endpoint),
    queryFn: async ({ signal }) => {
      if (!propertyId || !endpoint) {
        throw new Error("PROPERTY_REPORT_QUERY_CONFIGURATION_REQUIRED");
      }

      const response = await listPropertyReports({ endpoint, propertyId, signal });
      return response.reports.map(mapPropertyReport);
    },
  });
}
