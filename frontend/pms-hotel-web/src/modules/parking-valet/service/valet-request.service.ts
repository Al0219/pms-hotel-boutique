import { httpRequest } from "@/lib/http/client";

import type { ValetRequestListDto } from "../dtos/valet-request.dto";

export interface ListValetRequestsRequest {
  /** Approved by Backend; the module intentionally has no default endpoint. */
  endpoint: string;
  /** Resolved from an authorized staff session before this request is made. */
  propertyId: string;
  signal?: AbortSignal;
}

/**
 * The endpoint is injected by composition after Backend confirms the provisional contract.
 */
export async function listValetRequests({ endpoint, propertyId, signal }: ListValetRequestsRequest): Promise<ValetRequestListDto> {
  const searchParams = new URLSearchParams({ propertyId });
  const separator = endpoint.includes("?") ? "&" : "?";

  return httpRequest<ValetRequestListDto>({
    path: `${endpoint}${separator}${searchParams.toString()}`,
    signal,
  });
}
