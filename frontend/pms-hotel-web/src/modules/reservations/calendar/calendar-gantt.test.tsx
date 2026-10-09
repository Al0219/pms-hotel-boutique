import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError } from "@/lib/http/errors";

import { toDayKey } from "./calendar-gantt-model";
import { CalendarGantt } from "./calendar-gantt";

afterEach(() => cleanup());

const { useStaysMock, useRoomsMock } = vi.hoisted(() => ({
  useStaysMock: vi.fn(),
  useRoomsMock: vi.fn(),
}));

vi.mock("../hooks/use-staff-reservation-stays", () => ({ useStaffReservationStays: useStaysMock }));
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
    reservationId: "HB-2026-08421", stayId: "stay-1", confirmationCode: "HB-08421",
    propertyId: "GT-HB-01", guestName: "María López", roomId: "RM-203",
    roomType: "Deluxe", arrival: toDayKey(start), departure: toDayKey(end),
    reservationStatus: "CONFIRMED", travelState: "RESERVED", ...overrides,
  };
}

function mockSuccess() {
  useStaysMock.mockReturnValue({
    data: [reservation()],
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

const PROPS = { propertyId: "GT-HB-01", sessionId: "staff" };

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
    useStaysMock.mockReturnValue({ data: undefined, error: null, isLoading: true, refetch: vi.fn() });
    useRoomsMock.mockReturnValue({ data: [room()], error: null, isLoading: false, refetch: vi.fn() });
    render(<CalendarGantt {...PROPS} />);

    expect(screen.getByText("Cargando calendario…")).toBeInTheDocument();
  });

  it("shows an offline message and retries both sources on error", () => {
    const refetchCenter = vi.fn();
    const refetchRooms = vi.fn();
    useStaysMock.mockReturnValue({ data: undefined, error: new HttpNetworkError(), isLoading: false, refetch: refetchCenter });
    useRoomsMock.mockReturnValue({ data: undefined, error: null, isLoading: false, refetch: refetchRooms });
    render(<CalendarGantt {...PROPS} />);

    expect(screen.getByText("Sin conexión. No se pudo cargar el calendario.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(refetchCenter).toHaveBeenCalledTimes(1);
    expect(refetchRooms).toHaveBeenCalledTimes(1);
  });

  it("uses scoped real reads and hides cached data while refreshing", () => {
    mockSuccess();
    useStaysMock.mockReturnValue({ data: [reservation()], error: null, isLoading: false, fetchStatus: 'fetching' });
    render(<CalendarGantt {...PROPS} />);
    expect(useStaysMock).toHaveBeenCalledWith('GT-HB-01', 'staff');
    expect(useRoomsMock).toHaveBeenCalledWith('GT-HB-01', '/api/staff/rooms', 'staff');
    expect(screen.getByText('Cargando calendario…')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
  it('shows N stays and their actual states, including unassigned', () => {
    mockSuccess();
    useStaysMock.mockReturnValue({ data: [reservation(), reservation({ stayId: 'stay-2', roomId: null, travelState: 'IN_HOUSE' })], error: null, isLoading: false });
    render(<CalendarGantt {...PROPS} />);
    expect(screen.getAllByRole('link', { name: /María López/ })).toHaveLength(2);
    expect(screen.getByText('Sin asignar')).toBeInTheDocument();
    expect(screen.getByText('En estancia')).toBeInTheDocument();
  });
  it('shows a recoverable error for unknown rooms or stale scope', () => {
    mockSuccess();
    useStaysMock.mockReturnValue({ data: [reservation({ roomId: 'missing' })], error: null, isLoading: false, refetch: vi.fn() });
    const view = render(<CalendarGantt {...PROPS} />);
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar el calendario.');
    mockSuccess();
    view.rerender(<CalendarGantt propertyId="other-property" sessionId="staff" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

it('shows empty inventory without losing unassigned stays when inventory is empty', () => {
  mockSuccess();
  useRoomsMock.mockReturnValue({ data: [], error: null, isLoading: false });
  useStaysMock.mockReturnValue({ data: [], error: null, isLoading: false });
  const view = render(<CalendarGantt {...PROPS} />);
  expect(screen.getByText('No hay habitaciones para esta propiedad.')).toBeInTheDocument();
  useStaysMock.mockReturnValue({ data: [reservation({ roomId: null })], error: null, isLoading: false });
  view.rerender(<CalendarGantt {...PROPS} />);
  expect(screen.getByRole('link', { name: /María López/ })).toBeInTheDocument();
  expect(screen.getByText('Sin asignar')).toBeInTheDocument();
});
