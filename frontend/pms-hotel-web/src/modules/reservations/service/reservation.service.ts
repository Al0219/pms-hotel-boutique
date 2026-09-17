import { httpRequest } from "@/lib/http/client";

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