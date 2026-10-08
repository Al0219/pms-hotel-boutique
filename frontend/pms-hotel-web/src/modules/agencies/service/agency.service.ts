import { httpRequest } from "@/lib/http/client";

import type { AgencyListDto } from "../dtos/agency.dto";

export interface ListAgenciesRequest {
  /** Approved by Backend; the module intentionally has no default endpoint. */
  endpoint: string;
  /** Resolved from an authorized staff session before this request is made. */
  propertyId: string;
  signal?: AbortSignal;
}

/**
 * The endpoint is injected by composition after Backend confirms the provisional contract.
 */
export async function listAgencies({ endpoint, propertyId, signal }: ListAgenciesRequest): Promise<AgencyListDto> {
  const searchParams = new URLSearchParams({ propertyId });
  const separator = endpoint.includes("?") ? "&" : "?";

  return httpRequest<AgencyListDto>({
    path: `${endpoint}${separator}${searchParams.toString()}`,
    signal,
  });
}
