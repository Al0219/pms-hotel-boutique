import { httpRequest } from "@/lib/http/client";

import type { MaintenanceOrderListDto } from "../dtos/maintenance-order.dto";

export interface ListMaintenanceOrdersRequest {
  /** Approved by Backend; the module intentionally has no default endpoint. */
  endpoint: string;
  /** Resolved from an authorized staff session before this request is made. */
  propertyId: string;
  signal?: AbortSignal;
}

/**
 * The endpoint is injected by composition after Backend confirms the provisional contract.
 */
export async function listMaintenanceOrders({ endpoint, propertyId, signal }: ListMaintenanceOrdersRequest): Promise<MaintenanceOrderListDto> {
  const searchParams = new URLSearchParams({ propertyId });
  const separator = endpoint.includes("?") ? "&" : "?";

  return httpRequest<MaintenanceOrderListDto>({
    path: `${endpoint}${separator}${searchParams.toString()}`,
    signal,
  });
}
