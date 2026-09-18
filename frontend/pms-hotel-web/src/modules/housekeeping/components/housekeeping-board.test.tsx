import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError } from "@/lib/http/errors";

import { HousekeepingBoard } from "./housekeeping-board";

afterEach(() => cleanup());

const { useRoomCleaningMock } = vi.hoisted(() => ({ useRoomCleaningMock: vi.fn() }));

vi.mock("../hooks/use-room-cleaning", () => ({ useRoomCleaning: useRoomCleaningMock }));

describe("HousekeepingBoard", () => {
  it("presents coherent room IDs with base cleaning statuses and no overlays", () => {
    useRoomCleaningMock.mockReturnValue({
      data: [
        { id: "RM-101", propertyId: "GT-HB-01", roomLabel: "Habitación 101", status: "DIRTY" },
        { id: "RM-102", propertyId: "GT-HB-01", roomLabel: "Habitación 102", status: "INSPECTED" },
      ],
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(<HousekeepingBoard propertyId="GT-HB-01" endpoint="http://pms.test/contract/housekeeping" />);

    expect(screen.getByRole("heading", { name: "Housekeeping" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Habitación 101" })).toBeInTheDocument();
    expect(screen.getAllByText("Habitación 101")).toHaveLength(2);
    expect(screen.getAllByText("RM-101")).toHaveLength(2);
    expect(screen.getAllByText("Sucia")).toHaveLength(2);
    expect(screen.getByText("Inspeccionada")).toBeInTheDocument();
    expect(screen.queryByText("DND")).not.toBeInTheDocument();
    expect(screen.queryByText("Turndown")).not.toBeInTheDocument();
    expect(screen.queryByText("Pickup")).not.toBeInTheDocument();
  });

  it("does not query until composition supplies an authorized scope", () => {
    useRoomCleaningMock.mockReturnValue({ data: undefined, error: null, isLoading: false, refetch: vi.fn() });

    render(<HousekeepingBoard />);

    expect(screen.getByText(/scope de propiedad autorizado/i)).toBeInTheDocument();
  });

  it("renders the empty state for an explicit scope and approved endpoint", () => {
    useRoomCleaningMock.mockReturnValue({ data: [], error: null, isLoading: false, refetch: vi.fn() });

    render(<HousekeepingBoard propertyId="GT-HB-01" endpoint="http://pms.test/contract/housekeeping" />);

    expect(screen.getByText("No hay habitaciones para esta propiedad.")).toBeInTheDocument();
  });

  it("presents a dedicated offline message", () => {
    useRoomCleaningMock.mockReturnValue({ data: undefined, error: new HttpNetworkError(), isLoading: false, refetch: vi.fn() });

    render(<HousekeepingBoard propertyId="GT-HB-01" endpoint="http://pms.test/contract/housekeeping" />);

    expect(screen.getByText(/sin conexión/i)).toBeInTheDocument();
  });
});
