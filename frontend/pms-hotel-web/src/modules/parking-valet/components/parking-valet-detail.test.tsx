import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ParkingValetDetail } from "./parking-valet-detail";

afterEach(() => cleanup());

describe("ParkingValetDetail", () => {
  it("presents the valet request with vehicle and notes sections", () => {
    render(<ParkingValetDetail request={{
      id: "VR-001",
      propertyId: "GT-HB-01",
      guestName: "María García",
      vehicleDescription: "ABC-123 Toyota Corolla",
      requestType: "VALET_IN",
      status: "IN_PROGRESS",
      parkingSpace: "P-12",
      notes: "Llega en 30 minutos",
    }} />);

    expect(screen.getByRole("heading", { name: "María García" })).toBeInTheDocument();
    expect(screen.getByText("ABC-123 Toyota Corolla")).toBeInTheDocument();
    expect(screen.getByText("P-12")).toBeInTheDocument();
    expect(screen.getByText("Llega en 30 minutos")).toBeInTheDocument();
    expect(screen.getByText(/no envía mensajes directos al huésped/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("displays 'Sin asignar' when parking space is null", () => {
    render(<ParkingValetDetail request={{
      id: "VR-002",
      propertyId: "GT-HB-01",
      guestName: "Carlos López",
      vehicleDescription: "XYZ-789 Honda Civic",
      requestType: "PARKING",
      status: "PENDING",
      parkingSpace: null,
      notes: null,
    }} />);

    expect(screen.getAllByText("Sin asignar").length).toBeGreaterThanOrEqual(1);
  });
});
