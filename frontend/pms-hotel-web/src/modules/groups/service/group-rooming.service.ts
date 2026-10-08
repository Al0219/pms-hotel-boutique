import { httpRequest } from "@/lib/http/client";

import type { GroupDto } from "../dtos/group.dto";

export interface AddRoomingEntryRequest {
  /** Approved by Backend; the module intentionally has no default endpoint. */
  endpoint: string;
  /** Resolved from an authorized staff session before this request is made. */
  propertyId: string;
  groupId: string;
  guestName: string;
  roomLabel: string;
  signal?: AbortSignal;
}

/**
 * Agrega un huésped a la rooming list. Backend recalcula el pickup del block;
 * la UI invalida el directorio de grupos tras éxito.
 */
export async function addRoomingEntry({
  endpoint,
  propertyId,
  groupId,
  guestName,
  roomLabel,
  signal,
}: AddRoomingEntryRequest): Promise<GroupDto> {
  const searchParams = new URLSearchParams({ propertyId });
  const separator = endpoint.includes("?") ? "&" : "?";

  return httpRequest<GroupDto>({
    path: `${endpoint}/${encodeURIComponent(groupId)}/rooming-list${separator}${searchParams.toString()}`,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guest_name: guestName, room_label: roomLabel }),
    signal,
  });
}

export interface RemoveRoomingEntryRequest {
  /** Approved by Backend; the module intentionally has no default endpoint. */
  endpoint: string;
  /** Resolved from an authorized staff session before this request is made. */
  propertyId: string;
  groupId: string;
  entryId: string;
  signal?: AbortSignal;
}

/**
 * Quita un huésped de la rooming list. Backend recalcula el pickup del block.
 */
export async function removeRoomingEntry({
  endpoint,
  propertyId,
  groupId,
  entryId,
  signal,
}: RemoveRoomingEntryRequest): Promise<GroupDto> {
  const searchParams = new URLSearchParams({ propertyId });
  const separator = endpoint.includes("?") ? "&" : "?";

  return httpRequest<GroupDto>({
    path: `${endpoint}/${encodeURIComponent(groupId)}/rooming-list/${encodeURIComponent(entryId)}${separator}${searchParams.toString()}`,
    method: "DELETE",
    signal,
  });
}
