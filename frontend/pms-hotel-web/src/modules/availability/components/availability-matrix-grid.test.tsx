import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import type { AvailabilityMatrixResult } from "../model/availability-option";
import { AvailabilityMatrixGrid } from "./availability-matrix-grid";

const mockMatrixResult: AvailabilityMatrixResult = {
  propertyId: "prop_boutique_01",
  startDate: "2026-10-01",
  endDate: "2026-10-03",
  dates: ["2026-10-01", "2026-10-02", "2026-10-03"],
  matrix: [
    {
      roomTypeId: "rt_deluxe_king",
      roomTypeName: "Deluxe King Suite",
      roomTypeCode: "DLX-KNG",
      totalPhysicalCapacity: 10,
      dailyAvailability: [
        {
          date: "2026-10-01",
          physicalRooms: 10,
          soldRooms: 4,
          oooRooms: 1,
          oosRooms: 0,
          overbookingAdjustment: 0,
          ats: 5,
          occupancyRate: 44,
          stopSell: false,
        },
        {
          date: "2026-10-02",
          physicalRooms: 10,
          soldRooms: 6,
          oooRooms: 1,
          oosRooms: 0,
          overbookingAdjustment: 0,
          ats: 3,
          occupancyRate: 67,
          stopSell: false,
        },
        {
          date: "2026-10-03",
          physicalRooms: 10,
          soldRooms: 9,
          oooRooms: 1,
          oosRooms: 0,
          overbookingAdjustment: 0,
          ats: 0,
          occupancyRate: 100,
          stopSell: true,
        },
      ],
    },
  ],
  totalPropertyPhysicalRooms: 10,
  dailySummaries: [
    {
      date: "2026-10-01",
      totalPhysical: 10,
      totalSold: 4,
      totalOoo: 1,
      totalOos: 0,
      totalAts: 5,
      averageOccupancyRate: 44,
    },
    {
      date: "2026-10-02",
      totalPhysical: 10,
      totalSold: 6,
      totalOoo: 1,
      totalOos: 0,
      totalAts: 3,
      averageOccupancyRate: 67,
    },
    {
      date: "2026-10-03",
      totalPhysical: 10,
      totalSold: 9,
      totalOoo: 1,
      totalOos: 0,
      totalAts: 0,
      averageOccupancyRate: 100,
    },
  ],
};

describe("AvailabilityMatrixGrid Component", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders matrix table with room types, dates, capacity, sold and ATS badges", () => {
    render(<AvailabilityMatrixGrid matrixResult={mockMatrixResult} />);

    expect(screen.getByText("Matriz de Disponibilidad y ATS (Available to Sell)")).toBeDefined();
    expect(screen.getByText("Deluxe King Suite")).toBeDefined();
    expect(screen.getAllByText(/DLX-KNG/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Capacidad Física").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ATS (Disponible Venta)").length).toBeGreaterThan(0);
    expect(screen.getByText("Total Hotel ATS")).toBeDefined();
  });

  it("triggers onRefresh callback with updated filter values on submit", () => {
    const onRefreshMock = vi.fn();
    const { container } = render(
      <AvailabilityMatrixGrid
        matrixResult={mockMatrixResult}
        onRefresh={onRefreshMock}
      />,
    );

    const startDateInput = screen.getByLabelText(/Fecha Inicio/i);
    fireEvent.change(startDateInput, { target: { value: "2026-10-05" } });

    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(onRefreshMock).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyId: "prop_boutique_01",
        startDate: "2026-10-05",
      }),
    );
  });
});
