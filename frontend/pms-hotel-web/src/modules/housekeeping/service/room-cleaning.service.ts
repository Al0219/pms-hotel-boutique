import { httpRequest } from "@/lib/http/client";

import type { RoomCleaningListDto } from "../dtos/room-cleaning.dto";

export interface ListRoomCleaningRequest {
  /** Approved by Backend; the module intentionally has no default endpoint. */
  endpoint: string;
  /** Resolved from an authorized staff session before this request is made. */
  propertyId: string;
  signal?: AbortSignal;
}

/**
 * The endpoint is injected by composition after Backend confirms the provisional contract.
 */
export async function listRoomCleaning({ endpoint, propertyId, signal }: ListRoomCleaningRequest): Promise<RoomCleaningListDto> {
  const searchParams = new URLSearchParams({ propertyId });
  const separator = endpoint.includes("?") ? "&" : "?";

  return httpRequest<RoomCleaningListDto>({
    path: `${endpoint}${separator}${searchParams.toString()}`,
    signal,
  });
}
