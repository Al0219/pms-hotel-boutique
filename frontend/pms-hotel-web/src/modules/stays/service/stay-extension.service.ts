import { httpRequest } from "@/lib/http/client";

import type { StayExtensionApplyDto, StayExtensionPreviewDto } from "../dtos/stay-extension.dto";

export interface StayExtensionPreviewRequest {
  /** Approved by Backend; the module intentionally has no default endpoint. */
  endpoint: string;
  /** Resolved from an authorized staff session before this request is made. */
  propertyId: string;
  reservationId: string;
  /** Identifica la ReservationStay que se extiende (la Reservation puede tener N stays). */
  stayId: string;
  /** Nueva salida en "YYYY-MM-DD"; Backend revalida disponibilidad y tarifa. */
  newDeparture: string;
  signal?: AbortSignal;
}

export interface StayExtensionApplyRequest extends StayExtensionPreviewRequest {
  /** Motivo registrado en AuditTrail; opcional. */
  reason: string | null;
}

function basePath(endpoint: string): string {
  return endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;
}

/**
 * Proyecta disponibilidad adicional, tarifa confirmada y delta financiero sin ejecutar nada.
 * El UI no habilita la extensión sin un preview válido.
 * La disponibilidad se revalida nuevamente en el momento de confirmar.
 */
export async function previewStayExtension({
  endpoint,
  propertyId,
  reservationId,
  stayId,
  newDeparture,
  signal,
}: StayExtensionPreviewRequest): Promise<StayExtensionPreviewDto> {
  const searchParams = new URLSearchParams({ propertyId, stayId, newDeparture });
  const separator = endpoint.includes("?") ? "&" : "?";

  return httpRequest<StayExtensionPreviewDto>({
    path: `${basePath(endpoint)}/${encodeURIComponent(reservationId)}/extension-preview${separator}${searchParams.toString()}`,
    signal,
  });
}

/**
 * Confirma la extensión. Backend es la única fuente de verdad del resultado EXTENDED;
 * solo la salida (y el calendario/inventario) cambian y el Folio/cargos se conservan.
 */
export async function applyStayExtension({
  endpoint,
  propertyId,
  reservationId,
  stayId,
  newDeparture,
  reason,
  signal,
}: StayExtensionApplyRequest): Promise<StayExtensionApplyDto> {
  const searchParams = new URLSearchParams({ propertyId });
  const separator = endpoint.includes("?") ? "&" : "?";

  return httpRequest<StayExtensionApplyDto>({
    path: `${basePath(endpoint)}/${encodeURIComponent(reservationId)}/extension${separator}${searchParams.toString()}`,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ propertyId, reservationId, stayId, newDeparture, reason }),
    signal,
  });
}