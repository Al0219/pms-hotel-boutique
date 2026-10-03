import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { KpiCards } from "./KpiCards";
import type { RevenueKpiSummary } from "../model/revenue-kpi";

describe("KpiCards Component", () => {
  const mockSummary: RevenueKpiSummary = {
    occupancyPercent: 82.5,
    adr: 215.5,
    revPar: 177.78,
    pickup: 12,
    pace: 5.4,
    totalRoomsSold: 240,
    totalRoomsAvailable: 290,
    totalRevenue: 51720,
  };

  it("renders all key revenue metrics with correct formatting", () => {
    render(<KpiCards summary={mockSummary} currency="USD" />);

    expect(screen.getByText("Occupancy")).toBeInTheDocument();
    expect(screen.getByText("82.5%")).toBeInTheDocument();

    expect(screen.getByText("ADR")).toBeInTheDocument();
    expect(screen.getByText("$215.50")).toBeInTheDocument();

    expect(screen.getByText("RevPAR")).toBeInTheDocument();
    expect(screen.getByText("$177.78")).toBeInTheDocument();

    expect(screen.getByText("Pickup")).toBeInTheDocument();
    expect(screen.getByText("+12")).toBeInTheDocument();

    expect(screen.getByText("Pace")).toBeInTheDocument();
    expect(screen.getByText("5.4%")).toBeInTheDocument();
  });
});
