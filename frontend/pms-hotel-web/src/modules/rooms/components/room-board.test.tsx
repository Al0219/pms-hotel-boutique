import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError } from "@/lib/http/errors";

import { RoomBoard } from "./room-board";

afterEach(() => cleanup());

const { useRoomsMock, useChangeStatusMock, useOccupancyMock } = vi.hoisted(() => ({
  useRoomsMock: vi.fn(),
  useChangeStatusMock: vi.fn(),
  useOccupancyMock: vi.fn(),
}));

vi.mock("../hooks/use-rooms", () => ({ useRooms: useRoomsMock }));
vi.mock("../hooks/use-room-status-change", () => ({ useChangeRoomStatus: useChangeStatusMock }));
vi.mock('../hooks/use-room-occupancy', () => ({ useRoomOccupancy: useOccupancyMock }));
beforeEach(() => useOccupancyMock.mockReturnValue({ connected: false, query: { isSuccess: false, isError: false, isFetching: false, refetch: vi.fn() } }));

describe("RoomBoard", () => {
  it('paginates filtered rows only, preserving full metrics and unassigned stays and resetting on date/property changes', () => {
    const rooms = Array.from({ length: 35 }, (_, index) => ({ id: `room-${index}`, propertyId: 'GT-HB-01', number: String(100 + index),
      floor: null, status: null, roomTypeLabel: index < 30 ? 'Deluxe' : 'Suite', readOnly: true }));
    useRoomsMock.mockReturnValue({ data: rooms, error: null, isLoading: false, refetch: vi.fn() });
    const unassignedStay = { reservationId: 'RES-U', stayId: 'S-U', guestName: 'Ana Pérez', roomType: 'Deluxe', arrival: '2026-08-28', departure: '2026-08-31', state: 'RESERVED' };
    const data = { propertyId: 'GT-HB-01', date: '2026-08-28', rooms: rooms.map((room, index) => ({ roomId: room.id, state: index < 10 ? 'RESERVED' : 'FREE', stays: [] })),
      unassigned: [unassignedStay, { ...unassignedStay, stayId: 'S-U2' }] };
    useOccupancyMock.mockReturnValue({ connected: true, query: { data, isSuccess: true, isError: false, isFetching: false, refetch: vi.fn() } });
    const { rerender } = render(<RoomBoard propertyId="GT-HB-01" endpoint="/api/staff/rooms" timezone="America/Guatemala" />);
    fireEvent.change(screen.getByLabelText('Fecha de consulta'), { target: { value: '2026-08-28' } });
    expect(screen.getByLabelText('Filas por página')).toHaveValue('25');
    expect(screen.getByText('1–25 de 35 habitaciones')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    expect(screen.getByText('26–35 de 35 habitaciones')).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /Habitación 100/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '35 Total físico' })).toBeInTheDocument();
    expect(screen.getByLabelText('Estadías sin habitación asignada')).toHaveTextContent('2 estadías');
    fireEvent.change(screen.getByLabelText('Tipo de habitación'), { target: { value: 'Deluxe' } });
    expect(screen.getByText('1–25 de 30 habitaciones')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Filas por página'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    fireEvent.change(screen.getByLabelText('Ocupación'), { target: { value: 'FREE' } });
    expect(screen.getByText('1–5 de 20 habitaciones')).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Habitación 110/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '25 Libre de estadías' })).toBeInTheDocument();
    expect(screen.getByLabelText('Estadías sin habitación asignada')).toHaveTextContent('2 estadías');
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    data.date = '2026-08-29';
    fireEvent.change(screen.getByLabelText('Fecha de consulta'), { target: { value: '2026-08-29' } });
    expect(screen.getByText('1–5 de 20 habitaciones')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    data.propertyId = 'GT-HB-02';
    useRoomsMock.mockReturnValue({ data: rooms.map(room => ({ ...room, propertyId: 'GT-HB-02' })), error: null, isLoading: false, refetch: vi.fn() });
    rerender(<RoomBoard propertyId="GT-HB-02" endpoint="/api/staff/rooms" timezone="America/Guatemala" />);
    expect(screen.getByText('1–5 de 20 habitaciones')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(screen.getByText('1–5 de 35 habitaciones')).toBeInTheDocument();
  });
  it('combines dated occupancy, operational, type, floor and search filters, preserving the query date when clearing', () => {
    useRoomsMock.mockReturnValue({ data: [
      { id: 'A', propertyId: 'GT-HB-01', number: '101', floor: '1', status: 'ACTIVE', roomTypeLabel: 'Estándar' },
      { id: 'B', propertyId: 'GT-HB-01', number: '102', floor: '1', status: 'ACTIVE', roomTypeLabel: 'Estándar' },
      { id: 'C', propertyId: 'GT-HB-01', number: '201', floor: '2', status: 'OOO', roomTypeLabel: 'Deluxe' },
      { id: 'D', propertyId: 'GT-HB-01', number: '202', floor: null, status: 'OOS', roomTypeLabel: 'Deluxe' },
    ], error: null, isLoading: false, refetch: vi.fn() });
    useChangeStatusMock.mockReturnValue({ mutate: vi.fn(), reset: vi.fn(), isPending: false, isSuccess: false, isError: false });
    const guest = { reservationId: 'RES-1', stayId: 'S-1', guestName: 'Ana Pérez', roomType: 'Estándar', arrival: '2026-08-28', departure: '2026-08-31', state: 'IN_HOUSE' };
    useOccupancyMock.mockReturnValue({ connected: true, query: { isSuccess: true, isError: false, isFetching: false,
      data: { propertyId: 'GT-HB-01', date: '2026-08-28', rooms: [
        { roomId: 'A', state: 'OCCUPIED', stays: [guest] }, { roomId: 'B', state: 'RESERVED', stays: [{ ...guest, stayId: 'S-2', state: 'RESERVED' }] },
        { roomId: 'C', state: 'FREE', stays: [] }, { roomId: 'D', state: 'FREE', stays: [] },
      ], unassigned: [{ ...guest, stayId: 'S-3', state: 'RESERVED' }] }, refetch: vi.fn() } });
    render(<RoomBoard propertyId="GT-HB-01" endpoint="http://pms.test/rooms" sessionId="STAFF-1" timezone="America/Guatemala" />);
    fireEvent.change(screen.getByLabelText('Fecha de consulta'), { target: { value: '2026-08-28' } });
    const metrics = within(screen.getByRole('group', { name: 'Filtrar por ocupación' }));
    fireEvent.click(metrics.getByRole('button', { name: '1 Ocupada' }));
    expect(screen.getByRole('row', { name: /Habitación 101/ })).toBeInTheDocument();
    expect(within(screen.getByRole('table', { name: 'Habitaciones del hotel' })).getByRole('link', { name: 'Abrir reserva RES-1' })).toHaveAttribute('href', '/reservas/RES-1');
    expect(screen.getByLabelText('Estadías sin habitación asignada')).toHaveTextContent('1 estadía');
    const filterCard = screen.getByRole('searchbox').closest('label')!.parentElement!.parentElement!;
    expect(filterCard).toContainElement(screen.getByLabelText('Fecha de consulta'));
    for (const action of ['Hoy', 'Actualizar', 'Limpiar filtros']) {
      expect(filterCard).toContainElement(screen.getByRole('button', { name: action }));
    }
    const metricsElement = screen.getByRole('group', { name: 'Filtrar por ocupación' });
    const unassigned = screen.getByLabelText('Estadías sin habitación asignada');
    expect(filterCard).not.toContainElement(metricsElement);
    expect(metricsElement.compareDocumentPosition(unassigned) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(unassigned.compareDocumentPosition(screen.getByRole('table')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(unassigned).not.toHaveAttribute('open');
    fireEvent.click(within(unassigned).getByText(/Sin asignar/));
    expect(unassigned).toHaveAttribute('open');
    fireEvent.change(screen.getByLabelText('Estado operativo'), { target: { value: 'OOO' } });
    expect(screen.getByText('No hay habitaciones con estos filtros.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(screen.getByLabelText('Fecha de consulta')).toHaveValue('2026-08-28');
    fireEvent.click(metrics.getByRole('button', { name: '2 Libre de estadías' }));
    fireEvent.change(screen.getByLabelText('Piso'), { target: { value: '2' } });
    expect(screen.getByText('1–1 de 1 habitaciones')).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Habitación 201/ })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Tipo de habitación' }), { target: { value: 'Estándar' } });
    expect(screen.getByText('No hay habitaciones con estos filtros.')).toBeInTheDocument();
  });
  it('does not present stale, missing or failed occupancy as free and offers a retry', () => {
    useRoomsMock.mockReturnValue({ data: [{ id: 'A', propertyId: 'GT-HB-01', number: '101', floor: null, status: 'ACTIVE', roomTypeLabel: 'Deluxe' }], isLoading: false, error: null, refetch: vi.fn() });
    useChangeStatusMock.mockReturnValue({ mutate: vi.fn(), reset: vi.fn() });
    const retry = vi.fn();
    useOccupancyMock.mockReturnValue({ connected: true, query: { isSuccess: false, isError: true, isFetching: false,
      data: { propertyId: 'OTHER', date: '2026-08-28', rooms: [{ roomId: 'A', state: 'FREE', stays: [] }], unassigned: [] }, refetch: retry } });
    render(<RoomBoard propertyId="GT-HB-01" endpoint="http://pms.test/rooms" sessionId="STAFF-1" timezone="America/Guatemala" />);
    expect(screen.getByText('Sin información', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '— Libre de estadías' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar ocupación' }));
    expect(retry).toHaveBeenCalledOnce();
  });
  it('filters physical rooms by operational status without presenting it as occupancy', () => {
    useRoomsMock.mockReturnValue({ data: [
      { id: 'RM-101', propertyId: 'GT-HB-01', number: '101', floor: '1', status: 'ACTIVE', roomTypeLabel: 'Deluxe King' },
      { id: 'RM-102', propertyId: 'GT-HB-01', number: '102', floor: null, status: 'OOO', roomTypeLabel: 'Standard' },
    ], error: null, isLoading: false, refetch: vi.fn() });
    useChangeStatusMock.mockReturnValue({ mutate: vi.fn(), reset: vi.fn(), isPending: false, isSuccess: false, isError: false });
    render(<RoomBoard propertyId="GT-HB-01" endpoint="http://pms.test/rooms" />);
    fireEvent.change(screen.getByLabelText('Estado operativo'), { target: { value: 'OOO' } });
    expect(screen.getByText('1–1 de 1 habitaciones')).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Habitación 102/ })).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /Habitación 101/ })).not.toBeInTheDocument();
    expect(screen.getByText('Relación no disponible')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '999' } });
    expect(screen.getByRole('status')).toHaveTextContent('No hay habitaciones con estos filtros');
    expect(screen.queryByRole('row', { name: /Habitación 102/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(screen.getByText('1–2 de 2 habitaciones')).toBeInTheDocument();
  });
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
    useChangeStatusMock.mockReturnValue({
      mutate: vi.fn(), reset: vi.fn(), isPending: false, isSuccess: false, isError: false, data: undefined, error: null,
    });

    render(<RoomBoard propertyId="GT-HB-01" endpoint="http://pms.test/contract/rooms" />);

    expect(screen.queryByRole("heading", { name: "Habitaciones" })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Habitaciones del hotel' })).not.toBeInTheDocument();
    const surface = screen.getByRole('region', { name: 'Lista de habitaciones' });
    const table = within(surface).getByRole('table', { name: 'Habitaciones del hotel' });
    expect(table).toHaveStyle({ minWidth: '940px' });
    const count = within(surface).getByText('1–2 de 2 habitaciones');
    expect(table.compareDocumentPosition(count) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(count).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('row', { name: /Habitación 101/ })).toBeInTheDocument();
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

  it("wires the OOO/OOS panel in the room detail", () => {
    useRoomsMock.mockReturnValue({
      data: [
        { id: "RM-103", propertyId: "GT-HB-01", number: "103", floor: "1", status: "OOO", roomTypeLabel: "Standard" },
      ],
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    });
    useChangeStatusMock.mockReturnValue({
      mutate: vi.fn(), reset: vi.fn(), isPending: false, isSuccess: false, isError: false, data: undefined, error: null,
    });

    render(<RoomBoard propertyId="GT-HB-01" endpoint="http://pms.test/contract/rooms" />);

    fireEvent.click(screen.getByText("Acciones de escenario local"));
    expect(screen.getByRole("heading", { name: "Bloqueo OOO / OOS" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Liberar a activa" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Poner fuera de servicio" })).toBeInTheDocument();
  });
});
