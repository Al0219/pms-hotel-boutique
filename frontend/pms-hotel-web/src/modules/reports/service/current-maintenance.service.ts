import { staffBffRead } from "@/lib/http/staff-bff";
import type { PropertyScope } from "@/modules/properties";

import type { CurrentMaintenanceResponseDto } from "../dtos/current-maintenance.dto";

export function getCurrentMaintenanceReport(scope: PropertyScope, signal?: AbortSignal): Promise<CurrentMaintenanceResponseDto> {
  const query = new URLSearchParams();
  if (scope.kind === "PROPERTY") query.set("propertyId", scope.propertyIds[0]);
  else query.set("scope", "ALL_PROPERTIES");
  return staffBffRead(`/api/v1/private/reports/maintenance/current?${query}`, signal);
}
