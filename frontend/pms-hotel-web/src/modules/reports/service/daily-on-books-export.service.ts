import { staffBffFile } from "@/lib/http/staff-bff-file";
import type { PropertyScope } from "@/modules/properties";

import type { DailyOnBooksExportDto } from "../dtos/daily-on-books-export.dto";
import { dailyOnBooksEndpoint } from "./daily-on-books.service";

export function getDailyOnBooksExport(scope: PropertyScope, from: string, to: string, signal?: AbortSignal): Promise<DailyOnBooksExportDto> {
  const params = new URLSearchParams({ from, to });
  if (scope.kind === "PROPERTY") params.set("propertyId", scope.propertyIds[0]); else params.set("scope", "ALL_PROPERTIES");
  return staffBffFile(`${dailyOnBooksEndpoint}/export?${params}`, signal);
}
