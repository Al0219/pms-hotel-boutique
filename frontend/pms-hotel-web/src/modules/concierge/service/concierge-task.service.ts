import { httpRequest } from "@/lib/http/client";

import type { ConciergeTaskListDto } from "../dtos/concierge-task.dto";

export interface ListConciergeTasksRequest {
  /** Approved by Backend; the module intentionally has no default endpoint. */
  endpoint: string;
  /** Resolved from an authorized staff session before this request is made. */
  propertyId: string;
  signal?: AbortSignal;
}

/**
 * The endpoint is injected by composition after Backend confirms the provisional contract.
 */
export async function listConciergeTasks({ endpoint, propertyId, signal }: ListConciergeTasksRequest): Promise<ConciergeTaskListDto> {
  const searchParams = new URLSearchParams({ propertyId });
  const separator = endpoint.includes("?") ? "&" : "?";

  return httpRequest<ConciergeTaskListDto>({
    path: `${endpoint}${separator}${searchParams.toString()}`,
    signal,
  });
}
