import { describe, it, expect } from 'vitest';
import { mapRevenueKpiResponseToDomain } from './revenue-kpi.mapper';
import { RevenueKpiResponseDto } from '../dtos/revenue-kpi.dto';

describe('revenue-kpi.mapper', () => {
  it('should map RevenueKpiResponseDto to RevenueKpi domain model correctly', () => {
    const dto: RevenueKpiResponseDto = {
      propertyId: 'prop-1',
      currency: 'USD',
      summary: {
        occupancyPercent: 80,
        adr: 150,
        revPar: 120,
        pickup: 5,
        pace: 2,
        totalRoomsSold: 80,
        totalRoomsAvailable: 100,
        totalRevenue: 12000,
      },
      daily: [
        {
          date: '2023-10-01',
          occupancyPercent: 80,
          adr: 150,
          revPar: 120,
          pickup: 2,
          pace: 1,
          roomsSold: 40,
          roomsAvailable: 50,
          revenue: 6000,
        },
      ],
    };

    const result = mapRevenueKpiResponseToDomain(dto);

    expect(result.propertyId).toBe('prop-1');
    expect(result.currency).toBe('USD');
    expect(result.summary.occupancyPercent).toBe(80);
    expect(result.daily).toHaveLength(1);
    expect(result.daily[0].date).toBe('2023-10-01');
  });
});
