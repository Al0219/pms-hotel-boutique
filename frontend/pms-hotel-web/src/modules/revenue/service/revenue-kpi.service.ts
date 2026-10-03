import { httpRequest } from "@/lib/http";

import type {
  RevenueKpiRequestDto,
  RevenueKpiResponseDto,
} from "../dtos/revenue-kpi.dto";

export async function fetchRevenueKpisDto(
  filters: RevenueKpiRequestDto,
  signal?: AbortSignal
): Promise<RevenueKpiResponseDto> {
  const params = new URLSearchParams();
  params.set("property_id", filters.property_id);
  params.set("start_date", filters.start_date);
  params.set("end_date", filters.end_date);

  return httpRequest<RevenueKpiResponseDto>({
    path: `/api/v1/private/revenue/kpis?${params.toString()}`,
    method: "GET",
    signal,
  });
}
