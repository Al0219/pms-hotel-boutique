import { httpRequest } from "@/lib/http/client";

import type { OperationalMessageListDto } from "../dtos/operational-message.dto";

export interface ListOperationalMessagesRequest {
  /** Approved by Backend; the module intentionally has no default endpoint. */
  endpoint: string;
  /** Resolved from an authorized staff session before this request is made. */
  propertyId: string;
  signal?: AbortSignal;
}

/**
 * The endpoint is injected by composition after Backend confirms the provisional contract.
 */
export async function listOperationalMessages({ endpoint, propertyId, signal }: ListOperationalMessagesRequest): Promise<OperationalMessageListDto> {
  const searchParams = new URLSearchParams({ propertyId });
  const separator = endpoint.includes("?") ? "&" : "?";

  return httpRequest<OperationalMessageListDto>({
    path: `${endpoint}${separator}${searchParams.toString()}`,
    signal,
  });
}
