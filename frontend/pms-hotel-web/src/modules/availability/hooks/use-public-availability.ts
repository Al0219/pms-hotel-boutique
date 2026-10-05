"use client";

import { useQuery } from "@tanstack/react-query";
import { DomainMappingError } from "@/lib/errors";
import { mapAvailabilityResponseToDomain, mapSearchParamsToQueryDto } from "../mappers/availability.mapper";
import { fetchAvailabilityDto } from "../service/availability.service";
import type { AvailabilitySearchParams } from "../model/availability-option";

export function usePublicAvailability(params: AvailabilitySearchParams | undefined) {
  return useQuery({
    queryKey: ["public-availability", params],
    enabled: Boolean(params),
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      if (!params) throw new Error("AVAILABILITY_CRITERIA_REQUIRED");
      const dto = await fetchAvailabilityDto(mapSearchParamsToQueryDto(params), signal);
      const result = mapAvailabilityResponseToDomain(dto);
      if (result.checkInDate !== params.checkInDate || result.checkOutDate !== params.checkOutDate ||
          (params.propertyId && result.propertyId !== params.propertyId)) {
        throw new DomainMappingError("AVAILABILITY_SEARCH_MISMATCH");
      }
      return result;
    },
  });
}
