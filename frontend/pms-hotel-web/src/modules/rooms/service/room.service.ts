import { httpRequest } from "@/lib/http/client";

import type { RoomListDto } from "../dtos/room.dto";

export interface ListRoomsRequest {
  /** Approved by Backend; the module intentionally has no default endpoint. */
  endpoint: string;
  /** Resolved from an authorized staff session before this request is made. */
  propertyId: string;
  signal?: AbortSignal;
}

/**
 * The endpoint is injected by composition after Backend confirms the provisional contract.
 */
export async function listRooms({ endpoint, propertyId, signal }: ListRoomsRequest): Promise<RoomListDto> {
  const searchParams = new URLSearchParams({ propertyId });
  const separator = endpoint.includes("?") ? "&" : "?";

  return httpRequest<RoomListDto>({
    path: `${endpoint}${separator}${searchParams.toString()}`,
    signal,
  });
}
