import { staffBffRead } from "@/lib/http/staff-bff";
import type { PropertyScope } from "@/modules/properties";

import type { DailyArrivalsDeparturesResponseDto } from "../dtos/daily-arrivals-departures.dto";

export function getDailyArrivalsDeparturesReport(scope: PropertyScope, from: string, to: string,
  signal?: AbortSignal): Promise<DailyArrivalsDeparturesResponseDto> {
  const query = new URLSearchParams({ from, to });
  if (scope.kind === "PROPERTY") query.set("propertyId", scope.propertyIds[0]);
  else query.set("scope", "ALL_PROPERTIES");
  return staffBffRead(`/api/v1/private/reports/arrivals-departures/daily?${query}`, signal);
}
