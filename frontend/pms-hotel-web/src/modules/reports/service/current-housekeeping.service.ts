import { staffBffRead } from "@/lib/http/staff-bff";
import type { PropertyScope } from "@/modules/properties";

import type { CurrentHousekeepingResponseDto } from "../dtos/current-housekeeping.dto";

export function getCurrentHousekeepingReport(scope: PropertyScope, signal?: AbortSignal): Promise<CurrentHousekeepingResponseDto> {
  const query = new URLSearchParams();
  if (scope.kind === "PROPERTY") query.set("propertyId", scope.propertyIds[0]);
  else query.set("scope", "ALL_PROPERTIES");
  return staffBffRead(`/api/v1/private/reports/housekeeping/current?${query}`, signal);
}
