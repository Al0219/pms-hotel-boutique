"use client";

import { useQuery } from "@tanstack/react-query";
import type { PropertyScope } from "@/modules/properties";

import { mapCurrentMaintenanceReport } from "../mappers/current-maintenance.mapper";
import { getCurrentMaintenanceReport } from "../service/current-maintenance.service";

export function useCurrentMaintenance(sessionId: string, scope: PropertyScope) {
  const scopeKey = `${scope.kind}:${scope.propertyIds.map(id => id.toLowerCase()).sort().join(",")}`;
  return useQuery({
    queryKey: ["reports", "maintenance-current", sessionId, scopeKey],
    enabled: Boolean(sessionId), retry: false, staleTime: 0, gcTime: 0,
    queryFn: async ({ signal }) => {
      const report = mapCurrentMaintenanceReport(await getCurrentMaintenanceReport(scope, signal));
      if (report.rows.some(row => !scope.propertyIds.some(id => id.toLowerCase() === row.propertyId.toLowerCase()))) {
        throw new Error("REPORT_SCOPE_MISMATCH");
      }
      return report;
    },
  });
}
