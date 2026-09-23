import { httpRequest } from "@/lib/http/client";

import type { PropertyReportListDto } from "../dtos/property-report.dto";

export interface ListPropertyReportsRequest {
  /** Approved by Backend; the module intentionally has no default endpoint. */
  endpoint: string;
  /** Resolved from an authorized staff session before this request is made. */
  propertyId: string;
  signal?: AbortSignal;
}

/**
 * The endpoint is injected by composition after Backend confirms the provisional contract.
 */
export async function listPropertyReports({ endpoint, propertyId, signal }: ListPropertyReportsRequest): Promise<PropertyReportListDto> {
  const searchParams = new URLSearchParams({ propertyId });
  const separator = endpoint.includes("?") ? "&" : "?";

  return httpRequest<PropertyReportListDto>({
    path: `${endpoint}${separator}${searchParams.toString()}`,
    signal,
  });
}
