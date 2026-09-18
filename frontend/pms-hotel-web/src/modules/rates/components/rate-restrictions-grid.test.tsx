import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RateRestrictionsGrid } from "./rate-restrictions-grid";
import { RateRestriction } from "../model/rate-restriction";

describe("RateRestrictionsGrid", () => {
  const sampleRestrictions: RateRestriction[] = [
    {
      restrictionId: "res-001",
      propertyId: "prop_boutique_01",
      ratePlanId: "rp_flexible",
      roomTypeId: "rt_deluxe_king",
      date: "2026-10-01",
      closedToArrival: false,
      closedToDeparture: false,
      minLengthOfStay: 1,
      stopSell: false,
      createdAt: new Date("2026-09-01T08:00:00Z"),
      updatedAt: new Date("2026-09-01T08:00:00Z"),
    },
    {
      restrictionId: "res-002",
      propertyId: "prop_boutique_01",
      ratePlanId: "rp_flexible",
      roomTypeId: "rt_deluxe_king",
      date: "2026-10-02",
      closedToArrival: true,
      closedToDeparture: false,
      minLengthOfStay: 2,
      stopSell: false,
      createdAt: new Date("2026-09-01T08:00:00Z"),
      updatedAt: new Date("2026-09-01T08:00:00Z"),
    },
  ];

  it("renders restrictions grid table headers and rows", () => {
    render(
      <RateRestrictionsGrid
        restrictions={sampleRestrictions}
        propertyId="prop_boutique_01"
      />
    );

    expect(screen.getByText("Gestión de Restricciones Tarifarias")).toBeInTheDocument();
    expect(screen.getByText("2026-10-01")).toBeInTheDocument();
    expect(screen.getByText("2026-10-02")).toBeInTheDocument();
    expect(screen.getByText("CTA ACTIVO")).toBeInTheDocument();
  });

  it("stages CTA edit and displays preview apply button", () => {
    render(
      <RateRestrictionsGrid
        restrictions={sampleRestrictions}
        propertyId="prop_boutique_01"
      />
    );

    const toggleCtaBtn = screen.getByLabelText("Toggle CTA for rp_flexible rt_deluxe_king 2026-10-01");
    fireEvent.click(toggleCtaBtn);

    expect(screen.getByText("Previsualizar y Aplicar (1)")).toBeInTheDocument();
    expect(screen.getByText("Descartar (1)")).toBeInTheDocument();
    expect(screen.getByText("Editado (Pendiente)")).toBeInTheDocument();
  });

  it("discards staged edits on clicking Descartar", () => {
    render(
      <RateRestrictionsGrid
        restrictions={sampleRestrictions}
        propertyId="prop_boutique_01"
      />
    );

    const toggleCtaBtn = screen.getByLabelText("Toggle CTA for rp_flexible rt_deluxe_king 2026-10-01");
    fireEvent.click(toggleCtaBtn);

    const discardBtn = screen.getByText("Descartar (1)");
    fireEvent.click(discardBtn);

    expect(screen.queryByText("Previsualizar y Aplicar (1)")).not.toBeInTheDocument();
  });

  it("opens preview modal and confirms changes successfully", async () => {
    const applyMock = vi.fn().mockResolvedValue(true);
    const refreshMock = vi.fn();

    render(
      <RateRestrictionsGrid
        restrictions={sampleRestrictions}
        propertyId="prop_boutique_01"
        onApplyChanges={applyMock}
        onRefresh={refreshMock}
      />
    );

    const toggleStopSellBtn = screen.getByLabelText(
      "Toggle StopSell for rp_flexible rt_deluxe_king 2026-10-01"
    );
    fireEvent.click(toggleStopSellBtn);

    const previewBtn = screen.getByText("Previsualizar y Aplicar (1)");
    fireEvent.click(previewBtn);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Previsualizar Cambios de Restricciones")).toBeInTheDocument();

    const confirmBtn = screen.getByText("Confirmar y Aplicar Cambios");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(applyMock).toHaveBeenCalledWith([
        expect.objectContaining({
          ratePlanId: "rp_flexible",
          roomTypeId: "rt_deluxe_king",
          date: "2026-10-01",
          stopSell: true,
        }),
      ]);
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("handles server apply failure without mutating confirmed state", async () => {
    const applyMock = vi.fn().mockResolvedValue(false);

    render(
      <RateRestrictionsGrid
        restrictions={sampleRestrictions}
        propertyId="prop_boutique_01"
        onApplyChanges={applyMock}
      />
    );

    const toggleStopSellBtn = screen.getByLabelText(
      "Toggle StopSell for rp_flexible rt_deluxe_king 2026-10-01"
    );
    fireEvent.click(toggleStopSellBtn);

    const previewBtn = screen.getByText("Previsualizar y Aplicar (1)");
    fireEvent.click(previewBtn);

    const confirmBtn = screen.getByText("Confirmar y Aplicar Cambios");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(
        screen.getByText(/Error al aplicar cambios en el servidor/i)
      ).toBeInTheDocument();
    });
  });
});
