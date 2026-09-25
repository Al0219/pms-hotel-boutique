import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchRevenueKpis } from './revenue-kpi.service';

describe('revenue-kpi.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch and map revenue KPIs successfully', async () => {
    const mockResponse = {
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
      daily: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await fetchRevenueKpis({
      propertyId: 'prop-1',
      startDate: '2023-10-01',
      endDate: '2023-10-02',
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/v1/private/revenue/kpis?propertyId=prop-1&startDate=2023-10-01&endDate=2023-10-02');
    expect(result.propertyId).toBe('prop-1');
    expect(result.summary.adr).toBe(150);
  });

  it('should throw an error if the response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
    });

    await expect(fetchRevenueKpis({
      propertyId: 'prop-1',
      startDate: '2023-10-01',
      endDate: '2023-10-02',
    })).rejects.toThrow('Failed to fetch revenue KPIs');
  });
});
