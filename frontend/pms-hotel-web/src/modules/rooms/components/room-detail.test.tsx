import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { RoomDetail } from "./room-detail";

afterEach(() => cleanup());

describe("RoomDetail", () => {
  it("presents the room status through the shared StatusBadge", () => {
    render(<RoomDetail room={{
      id: "RM-101", propertyId: "GT-HB-01", number: "101", floor: "1", status: "ACTIVE", roomTypeLabel: "Deluxe King",
    }} />);

    expect(screen.getByRole("heading", { name: "101" })).toBeInTheDocument();
    expect(screen.getByText("Activa")).toBeInTheDocument();
    expect(screen.getByText("Deluxe King")).toBeInTheDocument();
    expect(screen.getByText(/no eliminan la habitación/i)).toBeInTheDocument();
  });

  it("displays OOO status label", () => {
    render(<RoomDetail room={{
      id: "RM-102", propertyId: "GT-HB-01", number: "102", floor: "1", status: "OOO", roomTypeLabel: "Standard",
    }} />);

    expect(screen.getByText("Fuera de orden")).toBeInTheDocument();
  });

  it("displays OOS status label", () => {
    render(<RoomDetail room={{
      id: "RM-103", propertyId: "GT-HB-01", number: "103", floor: "2", status: "OOS", roomTypeLabel: "Suite",
    }} />);

    expect(screen.getByText("Fuera de servicio")).toBeInTheDocument();
  });
});
