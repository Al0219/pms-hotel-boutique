"use client";

import { useQuery } from "@tanstack/react-query";

import type { PropertyScope } from "@/modules/properties";

import { mapCurrentHousekeepingReport } from "../mappers/current-housekeeping.mapper";
import { getCurrentHousekeepingReport } from "../service/current-housekeeping.service";

export function useCurrentHousekeeping(sessionId: string, scope: PropertyScope) {
  const scopeKey = `${scope.kind}:${scope.propertyIds.map(id => id.toLowerCase()).sort().join(",")}`;
  return useQuery({
    queryKey: ["reports", "housekeeping-current", sessionId, scopeKey],
    enabled: Boolean(sessionId), retry: false, staleTime: 0, gcTime: 0,
    queryFn: async ({ signal }) => {
      const report = mapCurrentHousekeepingReport(await getCurrentHousekeepingReport(scope, signal));
      if (report.rows.some(row => !scope.propertyIds.some(id => id.toLowerCase() === row.propertyId.toLowerCase()))) {
        throw new Error("REPORT_SCOPE_MISMATCH");
      }
      return report;
    },
  });
}
