import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError } from "@/lib/http/errors";

import { HousekeepingBoard } from "./housekeeping-board";

afterEach(() => cleanup());

const { useRoomCleaningMock, useRoomsMock, useResolutionsMock, useResolveMock, useApplyTransitionMock } = vi.hoisted(() => ({
  useRoomCleaningMock: vi.fn(),
  useRoomsMock: vi.fn(),
  useResolutionsMock: vi.fn(),
  useResolveMock: vi.fn(),
  useApplyTransitionMock: vi.fn(),
}));

vi.mock("../hooks/use-room-cleaning", () => ({ useRoomCleaning: useRoomCleaningMock }));
vi.mock("@/modules/rooms", () => ({ useRooms: useRoomsMock }));
vi.mock("../hooks/use-cleaning-transition", () => ({
  useDiscrepancyResolutions: useResolutionsMock,
  useResolveDiscrepancy: useResolveMock,
  useApplyCleaningTransition: useApplyTransitionMock,
}));

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
    useApplyTransitionMock.mockReturnValue({
      mutate: vi.fn(), reset: vi.fn(), isPending: false, isSuccess: false, isError: false, data: undefined, error: null,
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

  it("wires cleaning actions and discrepancies when composition supplies every endpoint", () => {
    useRoomCleaningMock.mockReturnValue({
      data: [
        { id: "RM-101", propertyId: "GT-HB-01", roomLabel: "Habitación 101", status: "DIRTY" },
      ],
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    });
    useRoomsMock.mockReturnValue({
      data: [
        { id: "RM-101", propertyId: "GT-HB-01", number: "101", floor: "1", status: "ACTIVE", roomTypeLabel: "Estándar" },
      ],
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    });
    useResolutionsMock.mockReturnValue({ data: [], error: null, isLoading: false, refetch: vi.fn() });
    useResolveMock.mockReturnValue({ mutate: vi.fn(), reset: vi.fn(), isPending: false, isError: false });
    useApplyTransitionMock.mockReturnValue({
      mutate: vi.fn(), reset: vi.fn(), isPending: false, isSuccess: false, isError: false, data: undefined, error: null,
    });

    render(
      <HousekeepingBoard
        propertyId="GT-HB-01"
        endpoint="http://pms.test/contract/housekeeping"
        roomsEndpoint="http://pms.test/contract/rooms"
      />,
    );

    expect(screen.getByRole("button", { name: "Marcar limpia" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Discrepancias" })).toBeInTheDocument();
    expect(screen.getByText(/No lista para venta/)).toBeInTheDocument();
  });
});
