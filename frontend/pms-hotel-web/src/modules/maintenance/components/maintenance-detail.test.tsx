import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { MaintenanceOrder } from "../model/maintenance-order";

import { MaintenanceDetail } from "./maintenance-detail";

afterEach(() => cleanup());

const ORDER: MaintenanceOrder = {
  id: "OT-001",
  propertyId: "GT-HB-01",
  roomId: "101",
  title: "Fuga en baño",
  status: "IN_PROGRESS",
  roomImpact: "OOO",
  history: [{ status: "OPEN", note: "Reportada por HK", actorReference: "HK-01" }],
};

describe("MaintenanceDetail", () => {
  it("shows the visible history of the order", () => {
    render(<MaintenanceDetail order={ORDER} />);

    expect(screen.getByText("Reportada por HK")).toBeInTheDocument();
    expect(screen.getByText("HK-01")).toBeInTheDocument();
    expect(screen.getByText("Abierta")).toBeInTheDocument();
  });

  it("states that resolving never releases the room by itself", () => {
    render(<MaintenanceDetail order={ORDER} />);

    expect(screen.getByText(/no vuelve vendible la habitación por sí sola/i)).toBeInTheDocument();
    expect(screen.getByText("Out of Order")).toBeInTheDocument();
  });

  it("requests resolution with the order identifier", () => {
    const onResolve = vi.fn();
    render(<MaintenanceDetail order={ORDER} onResolve={onResolve} />);

    fireEvent.click(screen.getByRole("button", { name: "Marcar como resuelta" }));

    expect(onResolve).toHaveBeenCalledWith("OT-001");
  });

  it("does not offer resolution for a resolved order", () => {
    render(<MaintenanceDetail order={{ ...ORDER, status: "RESOLVED" }} onResolve={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Marcar como resuelta" })).not.toBeInTheDocument();
  });
});
