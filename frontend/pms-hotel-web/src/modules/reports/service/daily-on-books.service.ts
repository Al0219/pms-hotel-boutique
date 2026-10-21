import { staffBffRead } from "@/lib/http/staff-bff";
import type { PropertyScope } from "@/modules/properties";

import type { DailyOnBooksResponseDto } from "../dtos/daily-on-books.dto";

export const dailyOnBooksEndpoint = "/api/v1/private/reports/on-books/daily";

export function getDailyOnBooksReport(scope: PropertyScope, from: string, to: string, signal?: AbortSignal): Promise<DailyOnBooksResponseDto> {
  const params = new URLSearchParams({ from, to });
  if (scope.kind === "PROPERTY") params.set("propertyId", scope.propertyIds[0]);
  else params.set("scope", "ALL_PROPERTIES");
  return staffBffRead(`${dailyOnBooksEndpoint}?${params}`, signal);
}
