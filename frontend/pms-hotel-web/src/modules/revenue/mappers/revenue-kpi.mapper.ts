import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import type {
  RevenueKpiResponseDto,
  RevenueKpiRequestDto,
} from "../dtos/revenue-kpi.dto";
import type { RevenueKpi, RevenueKpiFilters } from "../model/revenue-kpi";

export function mapRevenueKpiFiltersToDto(filters: RevenueKpiFilters): RevenueKpiRequestDto {
  if (!filters || !filters.propertyId || !filters.startDate || !filters.endDate) {
    throw new DomainMappingError("Filtros de KPI de revenue incompletos", "RevenueKpiRequestDto");
  }

  return {
    property_id: filters.propertyId,
    start_date: filters.startDate,
    end_date: filters.endDate,
  };
}

export function mapRevenueKpiResponseToDomain(dto: RevenueKpiResponseDto): RevenueKpi {
  if (!dto || typeof dto !== "object") {
    throw new DomainMappingError("RevenueKpiResponseDto inválido", "RevenueKpi");
  }

  if (!dto.property_id || !dto.currency || !dto.summary) {
    throw new DomainMappingError("RevenueKpiResponseDto faltan campos obligatorios", "RevenueKpi");
  }

  return {
    propertyId: dto.property_id,
    currency: dto.currency,
    summary: {
      occupancyPercent: Number(dto.summary.occupancy_percent || 0),
      adr: Number(dto.summary.adr || 0),
      revPar: Number(dto.summary.rev_par || 0),
      pickup: Number(dto.summary.pickup || 0),
      pace: Number(dto.summary.pace || 0),
      totalRoomsSold: Number(dto.summary.total_rooms_sold || 0),
      totalRoomsAvailable: Number(dto.summary.total_rooms_available || 0),
      totalRevenue: Number(dto.summary.total_revenue || 0),
    },
    daily: Array.isArray(dto.daily)
      ? dto.daily.map((day) => ({
          date: day.date,
          occupancyPercent: Number(day.occupancy_percent || 0),
          adr: Number(day.adr || 0),
          revPar: Number(day.rev_par || 0),
          pickup: Number(day.pickup || 0),
          pace: Number(day.pace || 0),
          roomsSold: Number(day.rooms_sold || 0),
          roomsAvailable: Number(day.rooms_available || 0),
          revenue: Number(day.revenue || 0),
        }))
      : [],
  };
}
