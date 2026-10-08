import { httpRequest } from "@/lib/http/client";

import type { WaitlistConversionPreviewDto, WaitlistConversionResultDto } from "../dtos/waitlist.dto";

export interface WaitlistRequest {
  /** Approved by Backend; the module intentionally has no default endpoint. */
  endpoint: string;
  /** Resolved from an authorized staff session before this request is made. */
  propertyId: string;
  waitlistId: string;
  signal?: AbortSignal;
}

function basePath(endpoint: string): string {
  return endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;
}

/**
 * Preview de conversión: revalida disponibilidad y tarifa para las fechas de la solicitud.
 * El UI nunca ejecuta la conversión si este preview no devuelve disponibilidad.
 */
export async function previewWaitlistConversion({
  endpoint,
  propertyId,
  waitlistId,
  signal,
}: WaitlistRequest): Promise<WaitlistConversionPreviewDto> {
  const searchParams = new URLSearchParams({ propertyId });
  const separator = endpoint.includes("?") ? "&" : "?";

  return httpRequest<WaitlistConversionPreviewDto>({
    path: `${basePath(endpoint)}/waitlist/${encodeURIComponent(waitlistId)}/conversion-preview${separator}${searchParams.toString()}`,
    signal,
  });
}

/**
 * Confirma la conversión: crea la Reservation y marca la entrada CONVERTED.
 * Backend es la única fuente de verdad del resultado; conflictos (revalidación fallida)
 * llegan como respuesta no-OK y se propagan como error sin inventar éxito.
 */
export async function confirmWaitlistConversion({
  endpoint,
  propertyId,
  waitlistId,
  signal,
}: WaitlistRequest): Promise<WaitlistConversionResultDto> {
  const searchParams = new URLSearchParams({ propertyId });
  const separator = endpoint.includes("?") ? "&" : "?";

  return httpRequest<WaitlistConversionResultDto>({
    path: `${basePath(endpoint)}/waitlist/${encodeURIComponent(waitlistId)}/conversion${separator}${searchParams.toString()}`,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ propertyId, waitlistId }),
    signal,
  });
}