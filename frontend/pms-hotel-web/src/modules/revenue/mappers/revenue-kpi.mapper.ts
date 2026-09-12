import { RevenueKpiResponseDto } from '../dtos/revenue-kpi.dto';
import { RevenueKpi } from '../model/revenue-kpi';

export function mapRevenueKpiResponseToDomain(dto: RevenueKpiResponseDto): RevenueKpi {
  return {
    propertyId: dto.propertyId,
    currency: dto.currency,
    summary: {
      occupancyPercent: dto.summary.occupancyPercent,
      adr: dto.summary.adr,
      revPar: dto.summary.revPar,
      pickup: dto.summary.pickup,
      pace: dto.summary.pace,
      totalRoomsSold: dto.summary.totalRoomsSold,
      totalRoomsAvailable: dto.summary.totalRoomsAvailable,
      totalRevenue: dto.summary.totalRevenue,
    },
    daily: dto.daily.map((day) => ({
      date: day.date,
      occupancyPercent: day.occupancyPercent,
      adr: day.adr,
      revPar: day.revPar,
      pickup: day.pickup,
      pace: day.pace,
      roomsSold: day.roomsSold,
      roomsAvailable: day.roomsAvailable,
      revenue: day.revenue,
    })),
  };
}
