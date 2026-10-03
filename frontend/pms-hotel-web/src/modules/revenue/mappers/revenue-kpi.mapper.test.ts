import { describe, it, expect } from 'vitest';
import { mapRevenueKpiResponseToDomain, mapRevenueKpiFiltersToDto } from './revenue-kpi.mapper';
import { RevenueKpiResponseDto } from '../dtos/revenue-kpi.dto';

describe('revenue-kpi.mapper', () => {
  it('should correctly map RevenueKpiResponseDto to RevenueKpi domain model', () => {
    const dto: RevenueKpiResponseDto = {
      property_id: 'prop-1',
      currency: 'USD',
      summary: {
        occupancy_percent: 85.5,
        adr: 200,
        rev_par: 171,
        pickup: 10,
        pace: 4,
        total_rooms_sold: 85,
        total_rooms_available: 100,
        total_revenue: 17000,
      },
      daily: [
        {
          date: '2023-10-01',
          occupancy_percent: 85.5,
          adr: 200,
          rev_par: 171,
          pickup: 10,
          pace: 4,
          rooms_sold: 85,
          rooms_available: 100,
          revenue: 17000,
        },
      ],
    };

    const domain = mapRevenueKpiResponseToDomain(dto);

    expect(domain.propertyId).toBe('prop-1');
    expect(domain.currency).toBe('USD');
    expect(domain.summary.occupancyPercent).toBe(85.5);
    expect(domain.summary.adr).toBe(200);
    expect(domain.summary.revPar).toBe(171);
    expect(domain.daily).toHaveLength(1);
    expect(domain.daily[0].roomsSold).toBe(85);
  });

  it('should correctly map domain filters to DTO', () => {
    const dto = mapRevenueKpiFiltersToDto({
      propertyId: 'prop-1',
      startDate: '2026-10-01',
      endDate: '2026-10-07',
    });

    expect(dto.property_id).toBe('prop-1');
    expect(dto.start_date).toBe('2026-10-01');
    expect(dto.end_date).toBe('2026-10-07');
  });

  it('should throw DomainMappingError on invalid input', () => {
    // @ts-expect-error test invalid payload
    expect(() => mapRevenueKpiResponseToDomain(null)).toThrow();
    // @ts-expect-error test invalid filters
    expect(() => mapRevenueKpiFiltersToDto(null)).toThrow();
  });
});
