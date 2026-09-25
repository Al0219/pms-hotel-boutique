import { httpRequest } from "@/lib/http";

import type {
  RatePlanDto,
  RatePlanListFiltersDto,
  RatePlanListResponseDto,
} from "../dtos/rate-plan.dto";

export async function fetchRatePlansDto(
  filters?: RatePlanListFiltersDto,
  signal?: AbortSignal,
): Promise<RatePlanListResponseDto> {
  const params = new URLSearchParams();
  if (filters?.property_id) params.set("property_id", filters.property_id);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.search) params.set("search", filters.search);

  const queryString = params.toString();
  const path = queryString
    ? `/api/v1/private/rates?${queryString}`
    : "/api/v1/private/rates";

  return httpRequest<RatePlanListResponseDto>({
    path,
    method: "GET",
    signal,
  });
}

export async function fetchRatePlanByIdDto(
  ratePlanId: string,
  signal?: AbortSignal,
): Promise<RatePlanDto> {
  return httpRequest<RatePlanDto>({
    path: `/api/v1/private/rates/${encodeURIComponent(ratePlanId)}`,
    method: "GET",
    signal,
  });
}
