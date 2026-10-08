"use client";

import { useQuery } from "@tanstack/react-query";
import { useStaffSession } from "@/modules/auth";
import { usePropertyScope } from "@/modules/properties";
import { mapPortfolio, mapComparison } from "../mappers/portfolio.mapper";
import { getPortfolioDTO, getComparisonDTO } from "../service/portfolio.service";
import { stayDates, type ComparisonCriteria } from "../model/portfolio";

export function usePortfolio() {
  const { scope } = usePropertyScope();
  const session = useStaffSession();
  return useQuery({
    queryKey: ["private-09", "metrics", session.id, session.roleId, scope],
    enabled: scope !== null,
    queryFn: async ({ signal }) => {
      if (!scope) throw new Error("SCOPE_REQUIRED");
      return mapPortfolio(await getPortfolioDTO(scope, signal), scope.propertyIds);
    },
    retry: false,
  });
}

export function useComparison(criteria: ComparisonCriteria | null) {
  const { scope } = usePropertyScope();
  const session = useStaffSession();
  const allowed = session.permissions.includes("COMPARE_AVAILABILITY");
  const query = useQuery({
    queryKey: ["private-09", "comparison", session.id, session.roleId, scope, criteria],
    enabled: !!scope && !!criteria && allowed && stayDates(criteria).length > 0,
    queryFn: async ({ signal }) => {
      if (!scope || !criteria || !allowed) throw new Error("COMPARISON_SCOPE_REQUIRED");
      return mapComparison(await getComparisonDTO(scope, criteria, signal), scope.propertyIds, criteria);
    },
    retry: false,
  });
  return { query, allowed };
}
