"use client";

import { useQuery } from "@tanstack/react-query";

import type { PropertyScope } from "@/modules/properties";

import { mapDailyOnBooksReport } from "../mappers/daily-on-books.mapper";
import { getDailyOnBooksReport } from "../service/daily-on-books.service";

export function useDailyOnBooks(sessionId: string, scope: PropertyScope, from: string | null, to: string | null) {
  const scopeKey = scope.kind === "PROPERTY" ? scope.propertyIds[0] : "ALL_PROPERTIES";
  return useQuery({
    queryKey: ["reports", "on-books", sessionId, scopeKey, from, to],
    enabled: Boolean(sessionId && from && to), retry: false, staleTime: 0,
    queryFn: async ({ signal }) => {
      if (!from || !to) throw new Error("REPORT_DATES_REQUIRED");
      const report = mapDailyOnBooksReport(await getDailyOnBooksReport(scope, from, to, signal));
      if (scope.kind === "PROPERTY" && report.rows.some(row => row.propertyId.toLowerCase() !== scope.propertyIds[0].toLowerCase())) {
        throw new Error("REPORT_PROPERTY_MISMATCH");
      }
      if (scope.kind === "ALL_PROPERTIES" && report.rows.some(row => !scope.propertyIds.some(id => id.toLowerCase() === row.propertyId.toLowerCase()))) {
        throw new Error("REPORT_PROPERTY_MISMATCH");
      }
      return report;
    },
  });
}
