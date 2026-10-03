import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchRevenueKpisDto } from './revenue-kpi.service';

describe('revenue-kpi.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch revenue KPIs DTO successfully', async () => {
    const mockResponse = {
      property_id: 'prop-1',
      currency: 'USD',
      summary: {
        occupancy_percent: 80,
        adr: 150,
        rev_par: 120,
        pickup: 5,
        pace: 2,
        total_rooms_sold: 80,
        total_rooms_available: 100,
        total_revenue: 12000,
      },
      daily: [],
    };

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await fetchRevenueKpisDto({
      property_id: 'prop-1',
      start_date: '2023-10-01',
      end_date: '2023-10-02',
    });

    expect(fetchSpy).toHaveBeenCalled();
    expect(result.property_id).toBe('prop-1');
    expect(result.summary.adr).toBe(150);
  });

  it('should throw an error if the response is not ok', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({ error: { message: 'Internal Server Error' } }),
    } as Response);

    await expect(fetchRevenueKpisDto({
      property_id: 'prop-1',
      start_date: '2023-10-01',
      end_date: '2023-10-02',
    })).rejects.toThrow();
  });
});
