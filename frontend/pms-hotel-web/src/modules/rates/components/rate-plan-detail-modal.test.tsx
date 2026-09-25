import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import type { RatePlan } from "../model/rate-plan";
import { RatePlanDetailModal } from "./rate-plan-detail-modal";

const mockRatePlan: RatePlan = {
  ratePlanId: "rp_bar_flex",
  propertyId: "prop_boutique_01",
  code: "BAR-FLEX",
  name: "Tarifa Flexible (BAR)",
  description: "Tarifa estándar con cancelación gratuita hasta 48h.",
  status: "ACTIVE",
  pricingModel: "PER_NIGHT",
  currency: "USD",
  basePriceMultiplier: 1.0,
  cancellationPolicy: "Cancelación gratuita hasta 48 horas.",
  mealsIncluded: "Desayuno a la carta",
  applicableRoomTypeIds: ["rt_deluxe_king", "rt_master_suite"],
  createdAt: new Date("2026-01-10T10:00:00.000Z"),
  updatedAt: new Date("2026-09-01T12:00:00.000Z"),
};

describe("RatePlanDetailModal Component", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders detail modal with full commercial parameters and zero-inventory rule", () => {
    render(<RatePlanDetailModal ratePlan={mockRatePlan} onClose={vi.fn()} />);

    expect(screen.getByText("Tarifa Flexible (BAR)")).toBeDefined();
    expect(screen.getByText("BAR-FLEX")).toBeDefined();
    expect(screen.getByText(/1x sobre BAR/)).toBeDefined();
    expect(screen.getByText("Cancelación gratuita hasta 48 horas.")).toBeDefined();
    expect(screen.getByText("Desayuno a la carta")).toBeDefined();
    expect(screen.getByText(/Regla de Dominio:/)).toBeDefined();
  });

  it("triggers onClose when clicking Cerrar Detalle button", () => {
    const onCloseMock = vi.fn();
    render(<RatePlanDetailModal ratePlan={mockRatePlan} onClose={onCloseMock} />);

    fireEvent.click(screen.getByRole("button", { name: "Cerrar Detalle" }));
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});
