import { httpRequest } from "@/lib/http/client";

import type { GroupListDto } from "../dtos/group.dto";

export interface ListGroupsRequest {
  /** Approved by Backend; the module intentionally has no default endpoint. */
  endpoint: string;
  /** Resolved from an authorized staff session before this request is made. */
  propertyId: string;
  signal?: AbortSignal;
}

/**
 * The endpoint is injected by composition after Backend confirms the provisional contract.
 */
export async function listGroups({ endpoint, propertyId, signal }: ListGroupsRequest): Promise<GroupListDto> {
  const searchParams = new URLSearchParams({ propertyId });
  const separator = endpoint.includes("?") ? "&" : "?";

  return httpRequest<GroupListDto>({
    path: `${endpoint}${separator}${searchParams.toString()}`,
    signal,
  });
}
