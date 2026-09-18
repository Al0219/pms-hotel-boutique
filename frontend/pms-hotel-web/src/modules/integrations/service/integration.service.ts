import { httpRequest } from "@/lib/http/client";

import type { IntegrationListDto } from "../dtos/integration.dto";

export interface ListIntegrationsRequest {
  /** Approved by Backend; the module intentionally has no default endpoint. */
  endpoint: string;
  /** Resolved from an authorized staff session before this request is made. */
  propertyId: string;
  signal?: AbortSignal;
}

/**
 * The endpoint is injected by composition after Backend confirms the provisional contract.
 */
export async function listIntegrations({ endpoint, propertyId, signal }: ListIntegrationsRequest): Promise<IntegrationListDto> {
  const searchParams = new URLSearchParams({ propertyId });
  const separator = endpoint.includes("?") ? "&" : "?";

  return httpRequest<IntegrationListDto>({
    path: `${endpoint}${separator}${searchParams.toString()}`,
    signal,
  });
}
