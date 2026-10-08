import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError } from "@/lib/http/errors";

import { CalendarGantt } from "./calendar-gantt";

afterEach(() => cleanup());

const { useReservationCenterMock, useRoomsMock } = vi.hoisted(() => ({
  useReservationCenterMock: vi.fn(),
  useRoomsMock: vi.fn(),
}));

vi.mock("../hooks/use-reservation-center", () => ({ useReservationCenter: useReservationCenterMock }));
vi.mock("@/modules/rooms", () => ({ useRooms: useRoomsMock }));

function room(overrides = {}) {
  return {
    id: "RM-203",
    propertyId: "GT-HB-01",
    number: "203",
    floor: "2",
    status: "ACTIVE",
    roomTypeLabel: "Deluxe King",
    ...overrides,
  };
}

function reservation(overrides = {}) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4);
  return {
    id: "HB-2026-08421",
    propertyId: "GT-HB-01",
    guestName: "María López",
    sourceLabel: "Viajes Maya",
    sourceReference: null,
    roomLabel: "203",
    stayStart: start,
    stayEnd: end,
    nights: 3,
    adults: 2,
    roomCount: 1,
    currency: "GTQ",
    finance: { totalAmount: 3920, paidAmount: 2400, financeState: "BALANCE" },
    alertText: null,
    status: "CONFIRMED",
    statusDetail: null,
    ...overrides,
  };
}

function mockSuccess() {
  useReservationCenterMock.mockReturnValue({
    data: { reservations: [reservation()] },
    error: null,
    isLoading: false,
    refetch: vi.fn(),
  });
  useRoomsMock.mockReturnValue({
    data: [room()],
    error: null,
    isLoading: false,
    refetch: vi.fn(),
  });
}

const PROPS = { propertyId: "GT-HB-01", reservationsEndpoint: "http://pms.test/reservations", roomsEndpoint: "http://pms.test/rooms" };

describe("CalendarGantt", () => {
  it("renders rooms, booking bars linking to the reservation detail and the occupancy footer", () => {
    mockSuccess();
    render(<CalendarGantt {...PROPS} />);

    expect(screen.getByRole("heading", { name: "Calendario" })).toBeInTheDocument();
    expect(screen.getByText("203")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /María López/ })).toHaveAttribute("href", "/reservas/HB-2026-08421");

    const grid = screen.getByRole("table");
    expect(within(grid).getByText("Ocupación")).toBeInTheDocument();
  });

  it("moves the visible window with the temporal navigation", () => {
    mockSuccess();
    render(<CalendarGantt {...PROPS} />);

    const subtitle = () => screen.getByText(/Ocupación por habitación del/);
    const before = subtitle().textContent;

    fireEvent.click(screen.getByRole("button", { name: "Ventana siguiente" }));
    expect(subtitle().textContent).not.toBe(before);

    fireEvent.click(screen.getByRole("button", { name: "Hoy" }));
    expect(subtitle().textContent).toBe(before);
  });

  it("shows loading while any source is loading", () => {
    useReservationCenterMock.mockReturnValue({ data: undefined, error: null, isLoading: true, refetch: vi.fn() });
    useRoomsMock.mockReturnValue({ data: [room()], error: null, isLoading: false, refetch: vi.fn() });
    render(<CalendarGantt {...PROPS} />);

    expect(screen.getByText("Cargando calendario…")).toBeInTheDocument();
  });

  it("shows an offline message and retries both sources on error", () => {
    const refetchCenter = vi.fn();
    const refetchRooms = vi.fn();
    useReservationCenterMock.mockReturnValue({ data: undefined, error: new HttpNetworkError(), isLoading: false, refetch: refetchCenter });
    useRoomsMock.mockReturnValue({ data: undefined, error: null, isLoading: false, refetch: refetchRooms });
    render(<CalendarGantt {...PROPS} />);

    expect(screen.getByText("Sin conexión. No se pudo cargar el calendario.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(refetchCenter).toHaveBeenCalledTimes(1);
    expect(refetchRooms).toHaveBeenCalledTimes(1);
  });

  it("requires the staff property scope before querying", () => {
    useReservationCenterMock.mockReturnValue({ data: undefined, error: null, isLoading: false, refetch: vi.fn() });
    useRoomsMock.mockReturnValue({ data: undefined, error: null, isLoading: false, refetch: vi.fn() });
    render(<CalendarGantt reservationsEndpoint="http://pms.test/reservations" roomsEndpoint="http://pms.test/rooms" />);

    expect(screen.getByText(/scope de propiedad autorizado/)).toBeInTheDocument();
  });
});
