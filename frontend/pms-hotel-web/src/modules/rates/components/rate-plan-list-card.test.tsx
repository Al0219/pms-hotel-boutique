import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import type { RatePlan } from "../model/rate-plan";
import { RatePlanListCard } from "./rate-plan-list-card";

const mockRatePlans: RatePlan[] = [
  {
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
    applicableRoomTypeIds: ["rt_deluxe_king"],
    createdAt: new Date("2026-01-10T10:00:00.000Z"),
    updatedAt: new Date("2026-09-01T12:00:00.000Z"),
  },
  {
    ratePlanId: "rp_non_refundable",
    propertyId: "prop_boutique_01",
    code: "NON-REF",
    name: "Tarifa No Reembolsable",
    description: "Descuento del 15% por pago inmediato.",
    status: "INACTIVE",
    pricingModel: "PER_NIGHT",
    currency: "USD",
    basePriceMultiplier: 0.85,
    cancellationPolicy: "No reembolsable.",
    mealsIncluded: null,
    applicableRoomTypeIds: ["rt_deluxe_king"],
    createdAt: new Date("2026-01-10T10:00:00.000Z"),
    updatedAt: new Date("2026-09-01T12:00:00.000Z"),
  },
];

describe("RatePlanListCard Component", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders rate plan cards with name, code, status badge and multiplier", () => {
    render(<RatePlanListCard ratePlans={mockRatePlans} />);

    expect(screen.getByText("Catálogo de Planes Tarifarios (Rate Plans)")).toBeDefined();
    expect(screen.getByText("Tarifa Flexible (BAR)")).toBeDefined();
    expect(screen.getByText("BAR-FLEX")).toBeDefined();
    expect(screen.getByText("Tarifa No Reembolsable")).toBeDefined();
    expect(screen.getAllByText("Ver Detalle Comercial").length).toBe(2);
  });

  it("filters list by search text input", () => {
    render(<RatePlanListCard ratePlans={mockRatePlans} />);

    const searchInput = screen.getByPlaceholderText(/Buscar por nombre/i);
    fireEvent.change(searchInput, { target: { value: "Flexible" } });

    expect(screen.getByText("Tarifa Flexible (BAR)")).toBeDefined();
    expect(screen.queryByText("Tarifa No Reembolsable")).toBeNull();
  });

  it("calls onSelectRatePlan when clicking Ver Detalle button", () => {
    const onSelectMock = vi.fn();
    render(<RatePlanListCard ratePlans={mockRatePlans} onSelectRatePlan={onSelectMock} />);

    const detailButtons = screen.getAllByText("Ver Detalle Comercial");
    fireEvent.click(detailButtons[0]);

    expect(onSelectMock).toHaveBeenCalledWith(mockRatePlans[0]);
  });
});
