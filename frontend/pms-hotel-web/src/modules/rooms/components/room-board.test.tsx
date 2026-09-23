import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError } from "@/lib/http/errors";

import { RoomBoard } from "./room-board";

afterEach(() => cleanup());

const { useRoomsMock } = vi.hoisted(() => ({ useRoomsMock: vi.fn() }));

vi.mock("../hooks/use-rooms", () => ({ useRooms: useRoomsMock }));

describe("RoomBoard", () => {
  it("presents room numbers with status badges and room type labels", () => {
    useRoomsMock.mockReturnValue({
      data: [
        { id: "RM-101", propertyId: "GT-HB-01", number: "101", floor: "1", status: "ACTIVE", roomTypeLabel: "Deluxe King" },
        { id: "RM-102", propertyId: "GT-HB-01", number: "102", floor: "1", status: "OOO", roomTypeLabel: "Standard" },
      ],
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(<RoomBoard propertyId="GT-HB-01" endpoint="http://pms.test/contract/rooms" />);

    expect(screen.getByRole("heading", { name: "Habitaciones" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "101" })).toBeInTheDocument();
    expect(screen.getAllByText("Activa").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Fuera de orden")).toBeInTheDocument();
    expect(screen.getAllByText("Deluxe King").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Standard").length).toBeGreaterThanOrEqual(1);
  });

  it("does not query until composition supplies an authorized scope", () => {
    useRoomsMock.mockReturnValue({ data: undefined, error: null, isLoading: false, refetch: vi.fn() });

    render(<RoomBoard />);

    expect(screen.getByText(/scope de propiedad autorizado/i)).toBeInTheDocument();
  });

  it("renders the empty state for an explicit scope and approved endpoint", () => {
    useRoomsMock.mockReturnValue({ data: [], error: null, isLoading: false, refetch: vi.fn() });

    render(<RoomBoard propertyId="GT-HB-01" endpoint="http://pms.test/contract/rooms" />);

    expect(screen.getByText("No hay habitaciones para esta propiedad.")).toBeInTheDocument();
  });

  it("presents a dedicated offline message", () => {
    useRoomsMock.mockReturnValue({ data: undefined, error: new HttpNetworkError(), isLoading: false, refetch: vi.fn() });

    render(<RoomBoard propertyId="GT-HB-01" endpoint="http://pms.test/contract/rooms" />);

    expect(screen.getByText(/sin conexión/i)).toBeInTheDocument();
  });

  it("presents a general error message for non-network errors", () => {
    useRoomsMock.mockReturnValue({ data: undefined, error: new Error("UNEXPECTED"), isLoading: false, refetch: vi.fn() });

    render(<RoomBoard propertyId="GT-HB-01" endpoint="http://pms.test/contract/rooms" />);

    expect(screen.getByText(/no se pudo cargar el tablero/i)).toBeInTheDocument();
  });

  it("shows the loading state", () => {
    useRoomsMock.mockReturnValue({ data: undefined, error: null, isLoading: true, refetch: vi.fn() });

    render(<RoomBoard propertyId="GT-HB-01" endpoint="http://pms.test/contract/rooms" />);

    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });

  it("does not show OOS status when all rooms are ACTIVE or OOO", () => {
    useRoomsMock.mockReturnValue({
      data: [
        { id: "RM-101", propertyId: "GT-HB-01", number: "101", floor: "1", status: "ACTIVE", roomTypeLabel: "Deluxe King" },
      ],
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(<RoomBoard propertyId="GT-HB-01" endpoint="http://pms.test/contract/rooms" />);

    expect(screen.queryByText("Fuera de servicio")).not.toBeInTheDocument();
  });
});
