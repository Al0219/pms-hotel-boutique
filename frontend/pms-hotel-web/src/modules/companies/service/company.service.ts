import { httpRequest } from "@/lib/http/client";

import type { CompanyListDto } from "../dtos/company.dto";

export interface ListCompaniesRequest {
  /** Approved by Backend; the module intentionally has no default endpoint. */
  endpoint: string;
  /** Resolved from an authorized staff session before this request is made. */
  propertyId: string;
  signal?: AbortSignal;
}

/**
 * The endpoint is injected by composition after Backend confirms the provisional contract.
 */
export async function listCompanies({ endpoint, propertyId, signal }: ListCompaniesRequest): Promise<CompanyListDto> {
  const searchParams = new URLSearchParams({ propertyId });
  const separator = endpoint.includes("?") ? "&" : "?";

  return httpRequest<CompanyListDto>({
    path: `${endpoint}${separator}${searchParams.toString()}`,
    signal,
  });
}
