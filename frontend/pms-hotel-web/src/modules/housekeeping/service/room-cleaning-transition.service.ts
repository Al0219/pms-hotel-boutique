import { httpRequest } from "@/lib/http/client";

import type {
  CleaningTransitionRequestDto,
  CleaningTransitionResultDto,
  DiscrepancyResolutionListDto,
} from "../dtos/room-cleaning-transition.dto";
import type { RoomCleaningStatus } from "../model/room-cleaning";

export interface ApplyCleaningTransitionRequest {
  /** Approved by Backend; the module intentionally has no default endpoint. */
  endpoint: string;
  /** Resolved from an authorized staff session before this request is made. */
  propertyId: string;
  roomId: string;
  toStatus: RoomCleaningStatus;
  /** Obligatorio cuando toStatus es DIRTY. */
  reason: string | null;
  signal?: AbortSignal;
}

/**
 * Registra una transición de limpieza. Backend es la única fuente de verdad
 * del estado resultante; la UI invalida el board tras éxito.
 */
export async function applyCleaningTransition({
  endpoint,
  propertyId,
  roomId,
  toStatus,
  reason,
  signal,
}: ApplyCleaningTransitionRequest): Promise<CleaningTransitionResultDto> {
  const searchParams = new URLSearchParams({ propertyId });
  const separator = endpoint.includes("?") ? "&" : "?";
  const payload: CleaningTransitionRequestDto = { room_id: roomId, to_status: toStatus, reason };

  return httpRequest<CleaningTransitionResultDto>({
    path: `${endpoint}/${encodeURIComponent(roomId)}/transitions${separator}${searchParams.toString()}`,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
}

export interface DiscrepancyResolutionRequest {
  /** Approved by Backend; the module intentionally has no default endpoint. */
  endpoint: string;
  /** Resolved from an authorized staff session before this request is made. */
  propertyId: string;
  signal?: AbortSignal;
}

export async function listDiscrepancyResolutions({
  endpoint,
  propertyId,
  signal,
}: DiscrepancyResolutionRequest): Promise<DiscrepancyResolutionListDto> {
  const searchParams = new URLSearchParams({ propertyId });
  const separator = endpoint.includes("?") ? "&" : "?";

  return httpRequest<DiscrepancyResolutionListDto>({
    path: `${endpoint}/discrepancy-resolutions${separator}${searchParams.toString()}`,
    signal,
  });
}

export interface ResolveDiscrepancyRequest extends DiscrepancyResolutionRequest {
  roomId: string;
  reason: string;
}

/**
 * Marca una discrepancia como resuelta con motivo. No duplica resoluciones:
 * el registro es idempotente por habitación en el mock/Backend.
 */
export async function resolveDiscrepancy({
  endpoint,
  propertyId,
  roomId,
  reason,
  signal,
}: ResolveDiscrepancyRequest): Promise<DiscrepancyResolutionListDto> {
  const searchParams = new URLSearchParams({ propertyId });
  const separator = endpoint.includes("?") ? "&" : "?";

  return httpRequest<DiscrepancyResolutionListDto>({
    path: `${endpoint}/discrepancy-resolutions${separator}${searchParams.toString()}`,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ room_id: roomId, reason }),
    signal,
  });
}
