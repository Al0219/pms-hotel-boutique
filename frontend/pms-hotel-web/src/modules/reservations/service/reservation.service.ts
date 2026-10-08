import { httpRequest } from "@/lib/http/client";

import type { CancellationApplyDto, CancellationPreviewDto } from "../dtos/reservation-cancellation.dto";
import type { NoShowApplyDto, NoShowPreviewDto } from "../dtos/reservation-no-show.dto";
import type { ReservationDetailDto } from "../dtos/reservation-detail.dto";
import type { ReservationCenterDto } from "../dtos/reservation-list.dto";

export interface ReservationCenterRequest {
  /** Approved by Backend; the module intentionally has no default endpoint. */
  endpoint: string;
  /** Resolved from an authorized staff session before this request is made. */
  propertyId: string;
  signal?: AbortSignal;
}

/**
 * The endpoint is injected by composition after Backend confirms the provisional contract.
 */
export async function listReservationCenter({
  endpoint,
  propertyId,
  signal,
}: ReservationCenterRequest): Promise<ReservationCenterDto> {
  const searchParams = new URLSearchParams({ propertyId });
  const separator = endpoint.includes("?") ? "&" : "?";

  return httpRequest<ReservationCenterDto>({
    path: `${endpoint}${separator}${searchParams.toString()}`,
    signal,
  });
}

export interface ReservationDetailRequest {
  /** Approved by Backend; the module intentionally has no default endpoint. */
  endpoint: string;
  /** Resolved from an authorized staff session before this request is made. */
  propertyId: string;
  reservationId: string;
  signal?: AbortSignal;
}

/**
 * The endpoint is injected by composition after Backend confirms the provisional contract.
 * The reservation id is part of the path; the property scope is always explicit.
 */
export async function getReservationDetail({
  endpoint,
  propertyId,
  reservationId,
  signal,
}: ReservationDetailRequest): Promise<ReservationDetailDto> {
  const searchParams = new URLSearchParams({ propertyId });
  const separator = endpoint.includes("?") ? "&" : "?";
  const base = endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;

  return httpRequest<ReservationDetailDto>({
    path: `${base}/${encodeURIComponent(reservationId)}${separator}${searchParams.toString()}`,
    signal,
  });
}

export interface ReservationCancellationRequest {
  /** Approved by Backend; the module intentionally has no default endpoint. */
  endpoint: string;
  /** Resolved from an authorized staff session before this request is made. */
  propertyId: string;
  reservationId: string;
  signal?: AbortSignal;
}

export interface ApplyCancellationRequest extends ReservationCancellationRequest {
  /** Obligatorio: se registra en AuditTrail junto con política e importe. */
  reason: string;
}

/**
 * Proyecta la política (penalización/reembolso/liberación) sin ejecutar nada.
 * El UI no habilita la cancelación sin un preview válido.
 */
export async function previewCancellation({
  endpoint,
  propertyId,
  reservationId,
  signal,
}: ReservationCancellationRequest): Promise<CancellationPreviewDto> {
  const searchParams = new URLSearchParams({ propertyId });
  const separator = endpoint.includes("?") ? "&" : "?";
  const base = endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;

  return httpRequest<CancellationPreviewDto>({
    path: `${base}/${encodeURIComponent(reservationId)}/cancellation-preview${separator}${searchParams.toString()}`,
    signal,
  });
}

/**
 * Confirma la cancelación. El motivo es obligatorio y viaja con la petición;
 * Backend es la única fuente de verdad del resultado CANCELLED.
 */
export async function applyCancellation({
  endpoint,
  propertyId,
  reservationId,
  reason,
  signal,
}: ApplyCancellationRequest): Promise<CancellationApplyDto> {
  const searchParams = new URLSearchParams({ propertyId });
  const separator = endpoint.includes("?") ? "&" : "?";
  const base = endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;

  return httpRequest<CancellationApplyDto>({
    path: `${base}/${encodeURIComponent(reservationId)}/cancellation${separator}${searchParams.toString()}`,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ propertyId, reservationId, reason }),
    signal,
  });
}

export interface ReservationNoShowRequest {
  /** Approved by Backend; the module intentionally has no default endpoint. */
  endpoint: string;
  /** Resolved from an authorized staff session before this request is made. */
  propertyId: string;
  reservationId: string;
  signal?: AbortSignal;
}

/**
 * Proyecta la política (cargo permitido/liberación) sin ejecutar nada.
 * El UI no habilita la acción de no-show sin un preview válido.
 */
export async function previewNoShow({
  endpoint,
  propertyId,
  reservationId,
  signal,
}: ReservationNoShowRequest): Promise<NoShowPreviewDto> {
  const searchParams = new URLSearchParams({ propertyId });
  const separator = endpoint.includes("?") ? "&" : "?";
  const base = endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;

  return httpRequest<NoShowPreviewDto>({
    path: `${base}/${encodeURIComponent(reservationId)}/no-show-preview${separator}${searchParams.toString()}`,
    signal,
  });
}

/**
 * Confirma el no-show. Backend es la única fuente de verdad del resultado NO_SHOW.
 */
export async function applyNoShow({
  endpoint,
  propertyId,
  reservationId,
  signal,
}: ReservationNoShowRequest): Promise<NoShowApplyDto> {
  const searchParams = new URLSearchParams({ propertyId });
  const separator = endpoint.includes("?") ? "&" : "?";
  const base = endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;

  return httpRequest<NoShowApplyDto>({
    path: `${base}/${encodeURIComponent(reservationId)}/no-show${separator}${searchParams.toString()}`,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ propertyId, reservationId }),
    signal,
  });
}