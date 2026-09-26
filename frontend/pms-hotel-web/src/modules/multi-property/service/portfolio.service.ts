import { httpRequest } from "@/lib/http";
import type { PropertyScope } from "@/modules/properties";
import type { PortfolioDTO, ComparisonDTO } from "../dtos/portfolio.dto";
import type { ComparisonCriteria } from "../model/portfolio";

function request<T>(resource: string, scope: PropertyScope, criteria?: ComparisonCriteria, signal?: AbortSignal): Promise<T> {
  const url = new URL(`/__mock/private-09/${resource}`, window.location.origin);
  url.searchParams.set("scope", scope.kind);
  scope.propertyIds.forEach(id => url.searchParams.append("property", id));
  if (criteria) {
    url.searchParams.set("start", criteria.startDate);
    url.searchParams.set("end", criteria.endDate);
    url.searchParams.set("roomType", criteria.roomType);
  }
  return httpRequest({ path: url.href, signal });
}
export function getPortfolioDTO(scope: PropertyScope, signal?: AbortSignal) { return request<PortfolioDTO>("metrics", scope, undefined, signal); }
export function getComparisonDTO(scope: PropertyScope, criteria: ComparisonCriteria, signal?: AbortSignal) { return request<ComparisonDTO>("comparison", scope, criteria, signal); }
