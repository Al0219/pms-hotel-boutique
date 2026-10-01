import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RevenueDashboard } from './RevenueDashboard';
import { fetchRevenueKpisDto } from '../service/revenue-kpi.service';

vi.mock('../service/revenue-kpi.service', () => ({
  fetchRevenueKpisDto: vi.fn(),
}));

// Mock recharts as it uses SVG which can be problematic in JSDOM
vi.mock('recharts', () => {
  return {
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
    LineChart: () => <div data-testid="line-chart"></div>,
    Line: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Legend: () => null,
  };
});

describe('RevenueDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(fetchRevenueKpisDto).mockReturnValue(new Promise(() => {})); // pending promise
    const { container } = render(<RevenueDashboard propertyId="prop-1" />);
    
    // Check if pulse animation container exists
    const pulseElement = container.querySelector('.animate-pulse');
    expect(pulseElement).toBeInTheDocument();
  });

  it('renders error state if fetch fails', async () => {
    vi.mocked(fetchRevenueKpisDto).mockRejectedValue(new Error('Network error'));
    render(<RevenueDashboard propertyId="prop-1" />);
    
    await waitFor(() => {
      expect(screen.getByText('Error Loading Revenue Data')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('renders data correctly after fetch', async () => {
    vi.mocked(fetchRevenueKpisDto).mockResolvedValue({
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
    });

    render(<RevenueDashboard propertyId="prop-1" />);
    
    await waitFor(() => {
      expect(screen.getByText('Revenue Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('80.0%')).toBeInTheDocument(); // Occupancy
    expect(screen.getByText('$150.00')).toBeInTheDocument(); // ADR
    expect(screen.getByText('$120.00')).toBeInTheDocument(); // RevPAR
    expect(screen.getByText('+5')).toBeInTheDocument(); // Pickup
    expect(screen.getByText('2.0%')).toBeInTheDocument(); // Pace
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });
});
