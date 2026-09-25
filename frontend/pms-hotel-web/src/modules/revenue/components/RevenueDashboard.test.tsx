import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RevenueDashboard } from './RevenueDashboard';
import { fetchRevenueKpis } from '../service/revenue-kpi.service';

vi.mock('../service/revenue-kpi.service', () => ({
  fetchRevenueKpis: vi.fn(),
}));

// Mock recharts as it uses SVG which can be problematic in JSDOM
vi.mock('recharts', () => {
  const OriginalModule = vi.importActual('recharts');
  return {
    ...OriginalModule,
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
    vi.mocked(fetchRevenueKpis).mockReturnValue(new Promise(() => {})); // pending promise
    render(<RevenueDashboard propertyId="prop-1" />);
    
    // Check if pulse animation container exists
    expect(screen.getByText((content, element) => {
      return element?.className.includes('animate-pulse') || false;
    })).toBeInTheDocument();
  });

  it('renders error state if fetch fails', async () => {
    vi.mocked(fetchRevenueKpis).mockRejectedValue(new Error('Network error'));
    render(<RevenueDashboard propertyId="prop-1" />);
    
    await waitFor(() => {
      expect(screen.getByText('Error Loading Revenue Data')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('renders data correctly after fetch', async () => {
    vi.mocked(fetchRevenueKpis).mockResolvedValue({
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
