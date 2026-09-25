import { RevenueKpiFilters, RevenueKpi } from '../model/revenue-kpi';
import { RevenueKpiResponseDto } from '../dtos/revenue-kpi.dto';
import { mapRevenueKpiResponseToDomain } from '../mappers/revenue-kpi.mapper';

export async function fetchRevenueKpis(filters: RevenueKpiFilters): Promise<RevenueKpi> {
  const params = new URLSearchParams();
  params.append('propertyId', filters.propertyId);
  params.append('startDate', filters.startDate);
  params.append('endDate', filters.endDate);

  const response = await fetch(`/api/v1/private/revenue/kpis?${params.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch revenue KPIs');
  }

  const dto: RevenueKpiResponseDto = await response.json();
  return mapRevenueKpiResponseToDomain(dto);
}
