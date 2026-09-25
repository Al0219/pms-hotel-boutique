import { httpRequest } from "@/lib/http/client";

import type {
  IntegrationErrorDto,
  IntegrationErrorListDto,
} from "../dtos/integration-error.dto";

export interface ListIntegrationErrorsRequest {
  /** Approved by Backend; the module intentionally has no default endpoint. */
  endpoint: string;
  /** Resolved from an authorized staff session before this request is made. */
  propertyId: string;
  signal?: AbortSignal;
}

export async function listIntegrationErrors({
  endpoint,
  propertyId,
  signal,
}: ListIntegrationErrorsRequest): Promise<IntegrationErrorListDto> {
  const searchParams = new URLSearchParams({ propertyId });
  const separator = endpoint.includes("?") ? "&" : "?";

  return httpRequest<IntegrationErrorListDto>({
    path: `${endpoint}${separator}${searchParams.toString()}`,
    signal,
  });
}

export interface RetryIntegrationErrorRequest {
  /** Approved by Backend; the module intentionally has no default endpoint. */
  endpoint: string;
  /** Resolved from an authorized staff session before this request is made. */
  propertyId: string;
  errorId: string;
  /** Clave de idempotencia: repetirla no duplica side effects. */
  idempotencyKey: string;
  signal?: AbortSignal;
}

/**
 * Reintenta un error. Backend resuelve el reintento de forma idempotente por
 * idempotencyKey; la UI invalida la cola tras éxito.
 */
export async function retryIntegrationError({
  endpoint,
  propertyId,
  errorId,
  idempotencyKey,
  signal,
}: RetryIntegrationErrorRequest): Promise<IntegrationErrorDto> {
  const searchParams = new URLSearchParams({ propertyId });
  const separator = endpoint.includes("?") ? "&" : "?";

  return httpRequest<IntegrationErrorDto>({
    path: `${endpoint}/${encodeURIComponent(errorId)}/retry${separator}${searchParams.toString()}`,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idempotency_key: idempotencyKey }),
    signal,
  });
}
