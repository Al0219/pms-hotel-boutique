"use client";

import { useQuery } from "@tanstack/react-query";

import { mapCompany } from "../mappers/company.mapper";
import { listCompanies } from "../service/company.service";

export function useCompanies(propertyId: string | undefined, endpoint: string | undefined) {
  return useQuery({
    queryKey: ["companies", propertyId, endpoint],
    enabled: Boolean(propertyId && endpoint),
    queryFn: async ({ signal }) => {
      if (!propertyId || !endpoint) {
        throw new Error("COMPANY_QUERY_CONFIGURATION_REQUIRED");
      }

      const response = await listCompanies({ endpoint, propertyId, signal });
      return response.companies.map(mapCompany);
    },
  });
}
