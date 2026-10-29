"use client";

import { useQuery } from "@tanstack/react-query";

import type { PropertyScope } from "@/modules/properties";

import { mapDailyArrivalsDeparturesReport } from "../mappers/daily-arrivals-departures.mapper";
import { getDailyArrivalsDeparturesReport } from "../service/daily-arrivals-departures.service";

export function useDailyArrivalsDepartures(sessionId: string, scope: PropertyScope, from: string | null, to: string | null) {
  const scopeKey = `${scope.kind}:${scope.propertyIds.map(id => id.toLowerCase()).sort().join(",")}`;
  return useQuery({
    queryKey: ["reports", "arrivals-departures", sessionId, scopeKey, from, to],
    enabled: Boolean(sessionId && from && to), retry: false, staleTime: 0, gcTime: 0,
    queryFn: async ({ signal }) => {
      if (!from || !to) throw new Error("REPORT_DATES_REQUIRED");
      const report = mapDailyArrivalsDeparturesReport(await getDailyArrivalsDeparturesReport(scope, from, to, signal));
      if (report.rows.some(row => !scope.propertyIds.some(id => id.toLowerCase() === row.propertyId.toLowerCase()) || row.date < from || row.date > to)) {
        throw new Error("REPORT_SCOPE_OR_DATE_MISMATCH");
      }
      return report;
    },
  });
}
