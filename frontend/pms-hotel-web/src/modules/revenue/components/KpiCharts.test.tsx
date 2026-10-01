import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { KpiCharts } from "./KpiCharts";
import type { RevenueKpiDaily } from "../model/revenue-kpi";

// Mock ResponsiveContainer for jsdom environment
vi.mock("recharts", async () => {
  const original = await vi.importActual("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container" style={{ width: 800, height: 400 }}>
        {children}
      </div>
    ),
  };
});

describe("KpiCharts Component", () => {
  const mockDaily: RevenueKpiDaily[] = [
    {
      date: "2026-10-01",
      occupancyPercent: 80,
      adr: 200,
      revPar: 160,
      pickup: 2,
      pace: 1.5,
      roomsSold: 40,
      roomsAvailable: 50,
      revenue: 8000,
    },
    {
      date: "2026-10-02",
      occupancyPercent: 85,
      adr: 220,
      revPar: 187,
      pickup: 5,
      pace: 2.1,
      roomsSold: 42,
      roomsAvailable: 50,
      revenue: 9240,
    },
  ];

  it("renders daily performance trends title and chart container", () => {
    render(<KpiCharts data={mockDaily} />);

    expect(screen.getByText("Daily Performance Trends")).toBeInTheDocument();
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
  });
});
