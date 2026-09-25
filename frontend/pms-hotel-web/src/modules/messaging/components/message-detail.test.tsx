import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MessageDetail } from "./message-detail";

afterEach(() => cleanup());

describe("MessageDetail", () => {
  it("presents the internal queue without direct guest messaging", () => {
    render(<MessageDetail message={{
      id: "MSG-001",
      propertyId: "GT-HB-01",
      subject: "Servicio de habitación pendiente",
      body: "Habitación 302 solicita amenities adicionales.",
      senderRole: "OPERATIONS",
      status: "IN_PROGRESS",
      relatedReservationId: "RES-042",
      createdAt: new Date("2026-09-18T10:30:00Z"),
    }} />);

    expect(screen.getByRole("heading", { name: "Servicio de habitación pendiente" })).toBeInTheDocument();
    expect(screen.getByText("RES-042")).toBeInTheDocument();
    expect(screen.getByText(/no responde directamente al huésped/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows null reservation reference as 'Sin referencia'", () => {
    render(<MessageDetail message={{
      id: "MSG-002",
      propertyId: "GT-HB-01",
      subject: "Mantenimiento",
      body: "Reparar aire acondicionado en piso 2.",
      senderRole: "CONCIERGE",
      status: "PENDING",
      relatedReservationId: null,
      createdAt: new Date("2026-09-18T12:00:00Z"),
    }} />);

    expect(screen.getByText("Sin referencia")).toBeInTheDocument();
  });
});
