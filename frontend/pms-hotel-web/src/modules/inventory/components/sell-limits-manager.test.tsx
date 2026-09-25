import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SellLimitsManager } from "./sell-limits-manager";
import { SellLimit } from "../model/sell-limit";

describe("SellLimitsManager", () => {
  const sampleItems: SellLimit[] = [
    {
      limitId: "lim_001",
      propertyId: "prop_boutique_01",
      roomTypeId: "rt_deluxe_king",
      roomTypeName: "Deluxe King Suite",
      date: "2026-10-01",
      physicalRoomsCount: 10,
      oooRoomsCount: 1,
      oosRoomsCount: 0,
      soldRoomsCount: 4,
      overbookingLimit: 2,
      sellLimit: null,
      calculatedATS: 7, // 10 - 1 - 0 - 4 + 2 = 7
      updatedAt: new Date("2026-09-01T10:00:00Z"),
    },
  ];

  it("renders table with physical capacity, deductions, and calculated ATS", () => {
    render(
      <SellLimitsManager
        items={sampleItems}
        propertyId="prop_boutique_01"
      />
    );

    expect(screen.getByText("Gestión de Sell Limits y Overbooking")).toBeInTheDocument();
    expect(screen.getByText("Deluxe King Suite")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument(); // Physical capacity
    expect(screen.getByText("+2")).toBeInTheDocument(); // Overbooking badge
    expect(screen.getByText("7")).toBeInTheDocument(); // Calculated ATS
  });

  it("disables editing when canEdit is false", () => {
    render(
      <SellLimitsManager
        items={sampleItems}
        propertyId="prop_boutique_01"
        canEdit={false}
      />
    );

    expect(screen.getByText("Solo Lectura")).toBeInTheDocument();
    const adjustBtn = screen.getByLabelText("Editar límite para rt_deluxe_king 2026-10-01");
    expect(adjustBtn).toBeDisabled();
  });

  it("opens edit modal, recalculates ATS dynamically and saves adjustment", async () => {
    const updateMock = vi.fn().mockResolvedValue(true);
    const refreshMock = vi.fn();

    render(
      <SellLimitsManager
        items={sampleItems}
        propertyId="prop_boutique_01"
        onUpdateLimit={updateMock}
        onRefresh={refreshMock}
      />
    );

    const adjustBtn = screen.getByLabelText("Editar límite para rt_deluxe_king 2026-10-01");
    fireEvent.click(adjustBtn);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Ajustar Capacidad Vendible")).toBeInTheDocument();

    const overbookingInput = screen.getByLabelText("Margen de Overbooking");
    fireEvent.change(overbookingInput, { target: { value: "4" } });

    // New calculated ATS: 10 - 1 - 0 - 4 + 4 = 9
    expect(screen.getByText("9 habitaciones")).toBeInTheDocument();

    const confirmBtn = screen.getByText("Confirmar y Guardar");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith({
        propertyId: "prop_boutique_01",
        roomTypeId: "rt_deluxe_king",
        date: "2026-10-01",
        overbookingLimit: 4,
        sellLimit: null,
      });
      expect(refreshMock).toHaveBeenCalled();
    });
  });
});
