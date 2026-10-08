import { httpRequest } from "@/lib/http/client";

import type { RoomMoveApplyDto, RoomMovePreviewDto } from "../dtos/room-move.dto";

export interface RoomMovePreviewRequest {
  /** Approved by Backend; the module intentionally has no default endpoint. */
  endpoint: string;
  /** Resolved from an authorized staff session before this request is made. */
  propertyId: string;
  reservationId: string;
  /** Identifica la ReservationStay que se mueve (la Reservation puede tener N stays). */
  stayId: string;
  signal?: AbortSignal;
}

export interface RoomMoveApplyRequest extends RoomMovePreviewRequest {
  targetRoomId: string;
  /** Motivo registrado en AuditTrail; opcional. */
  reason: string | null;
}

function basePath(endpoint: string): string {
  return endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;
}

/**
 * Proyecta candidatos, compatibilidad, disponibilidad e impacto operativo sin ejecutar nada.
 * El UI no habilita el cambio de habitación sin un preview válido.
 * La disponibilidad se revalida nuevamente en el momento de confirmar.
 */
export async function previewRoomMove({
  endpoint,
  propertyId,
  reservationId,
  stayId,
  signal,
}: RoomMovePreviewRequest): Promise<RoomMovePreviewDto> {
  const searchParams = new URLSearchParams({ propertyId, stayId });
  const separator = endpoint.includes("?") ? "&" : "?";

  return httpRequest<RoomMovePreviewDto>({
    path: `${basePath(endpoint)}/${encodeURIComponent(reservationId)}/room-move-preview${separator}${searchParams.toString()}`,
    signal,
  });
}

/**
 * Confirma el cambio de habitación. Backend es la única fuente de verdad del resultado ROOM_MOVED;
 * solo el room assignment cambia y el Folio/cargos se conservan.
 */
export async function applyRoomMove({
  endpoint,
  propertyId,
  reservationId,
  stayId,
  targetRoomId,
  reason,
  signal,
}: RoomMoveApplyRequest): Promise<RoomMoveApplyDto> {
  const searchParams = new URLSearchParams({ propertyId });
  const separator = endpoint.includes("?") ? "&" : "?";

  return httpRequest<RoomMoveApplyDto>({
    path: `${basePath(endpoint)}/${encodeURIComponent(reservationId)}/room-move${separator}${searchParams.toString()}`,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ propertyId, reservationId, stayId, targetRoomId, reason }),
    signal,
  });
}