import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HousekeepingDiscrepancies } from "./housekeeping-discrepancies";

afterEach(() => cleanup());

const { useRoomsMock, useRoomCleaningMock, useResolutionsMock, useResolveMock } = vi.hoisted(() => ({
  useRoomsMock: vi.fn(),
  useRoomCleaningMock: vi.fn(),
  useResolutionsMock: vi.fn(),
  useResolveMock: vi.fn(),
}));

vi.mock("@/modules/rooms", () => ({ useRooms: useRoomsMock }));
vi.mock("../hooks/use-room-cleaning", () => ({ useRoomCleaning: useRoomCleaningMock }));
vi.mock("../hooks/use-cleaning-transition", () => ({
  useDiscrepancyResolutions: useResolutionsMock,
  useResolveDiscrepancy: useResolveMock,
  useApplyCleaningTransition: vi.fn(),
}));

const PROPS = {
  propertyId: "GT-HB-01",
  roomsEndpoint: "http://pms.test/rooms",
  cleaningEndpoint: "http://pms.test/room-cleaning",
};

function mockQueries() {
  useRoomsMock.mockReturnValue({
    data: [{ id: "RM-101", propertyId: "GT-HB-01", number: "101", floor: "1", status: "ACTIVE", roomTypeLabel: "Estándar" }],
    error: null,
    isLoading: false,
    refetch: vi.fn(),
  });
  useRoomCleaningMock.mockReturnValue({
    data: [{ id: "RM-101", propertyId: "GT-HB-01", roomLabel: "101", status: "DIRTY" }],
    error: null,
    isLoading: false,
    refetch: vi.fn(),
  });
  useResolutionsMock.mockReturnValue({
    data: [],
    error: null,
    isLoading: false,
    refetch: vi.fn(),
  });
  useResolveMock.mockReturnValue({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
  });
}

describe("HousekeepingDiscrepancies", () => {
  it("compares front office against housekeeping and resolves with a reason", () => {
    const mutate = vi.fn();
    mockQueries();
    useResolveMock.mockReturnValue({ mutate, reset: vi.fn(), isPending: false, isError: false });

    render(<HousekeepingDiscrepancies {...PROPS} />);

    expect(screen.getByText(/No lista para venta/)).toBeInTheDocument();
    expect(screen.getByText(/FO: Vendible/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Resolver" }));
    fireEvent.change(screen.getByPlaceholderText("Cómo se resolvió la diferencia"), {
      target: { value: "Limpieza prioritaria completada" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Resolver" })[0]);

    expect(mutate).toHaveBeenCalledWith(
      { roomId: "RM-101", reason: "Limpieza prioritaria completada" },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("reports agreement between front office and housekeeping", () => {
    mockQueries();
    useRoomCleaningMock.mockReturnValue({
      data: [{ id: "RM-101", propertyId: "GT-HB-01", roomLabel: "101", status: "CLEAN" }],
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(<HousekeepingDiscrepancies {...PROPS} />);

    expect(screen.getByText(/coinciden/i)).toBeInTheDocument();
  });
});
