import { httpRequest } from "@/lib/http/client";

import type {
  RoomStatusChangeRequestDto,
  RoomStatusChangeResultDto,
} from "../dtos/room-status-change.dto";
import type { RoomStatus } from "../model/room";

export interface ChangeRoomStatusRequest {
  /** Approved by Backend; the module intentionally has no default endpoint. */
  endpoint: string;
  /** Resolved from an authorized staff session before this request is made. */
  propertyId: string;
  roomId: string;
  toStatus: RoomStatus;
  reason: string;
  startDate: string | null;
  endDate: string | null;
  signal?: AbortSignal;
}

/**
 * Registra un bloqueo OOO/OOS o una liberación. Backend es la única fuente de
 * verdad del estado resultante; el recálculo de disponibilidad (ATS) lo refleja
 * el módulo Inventory (WEB-4). La UI invalida el board tras éxito.
 */
export async function changeRoomStatus({
  endpoint,
  propertyId,
  roomId,
  toStatus,
  reason,
  startDate,
  endDate,
  signal,
}: ChangeRoomStatusRequest): Promise<RoomStatusChangeResultDto> {
  const searchParams = new URLSearchParams({ propertyId });
  const separator = endpoint.includes("?") ? "&" : "?";
  const payload: RoomStatusChangeRequestDto = {
    room_id: roomId,
    to_status: toStatus,
    reason,
    start_date: startDate,
    end_date: endDate,
  };

  return httpRequest<RoomStatusChangeResultDto>({
    path: `${endpoint}/${encodeURIComponent(roomId)}/status-change${separator}${searchParams.toString()}`,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
}
