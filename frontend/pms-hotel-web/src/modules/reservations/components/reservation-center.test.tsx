import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError } from "@/lib/http/errors";

import { ReservationCenter } from "./reservation-center";

afterEach(() => cleanup());

const { useReservationCenterMock } = vi.hoisted(() => ({ useReservationCenterMock: vi.fn() }));

vi.mock("../hooks/use-reservation-center", () => ({ useReservationCenter: useReservationCenterMock }));

function centerData() {
  return {
    summary: {
      arrivalsToday: 18,
      departuresToday: 126,
      vipToday: 2,
      multiRoomToday: 2,
      lateCheckoutToday: 2,
      alerts: 4,
      confirmedNextDays: 37,
      decisionsRequired: 2,
      total: 1,
    },
    alerts: [{
      id: "AL-1",
      kind: "NO_SHOW_PENDING",
      message: "No-show pendiente · HB-2026-08458 · llegada vencida 18:00",
    }],
    reservations: [{
      id: "HB-2026-08421",
      propertyId: "GT-HB-01",
      guestName: "María López",
      sourceLabel: "Viajes Maya",
      sourceReference: "VM-77821 · TA-MAYA-01",
      roomLabel: "203",
      stayStart: new Date(2026, 7, 28),
      stayEnd: new Date(2026, 7, 31),
      nights: 3,
      adults: 2,
      roomCount: 1,
      currency: "GTQ",
      finance: { totalAmount: 3920, paidAmount: 2400, financeState: "BALANCE" },
      alertText: "Garantía vence hoy 20:00",
      status: "CONFIRMED",
      statusDetail: "Check-in 28 ago · 15:00",
    }],
  };
}

describe("ReservationCenter", () => {
  it("does not query until composition supplies an authorized scope", () => {
    useReservationCenterMock.mockReturnValue({ data: undefined, error: null, isLoading: false, refetch: vi.fn() });

    render(<ReservationCenter />);

    expect(screen.getByText(/scope de propiedad autorizado/i)).toBeInTheDocument();
  });

  it("waits for the approved endpoint before querying", () => {
    useReservationCenterMock.mockReturnValue({ data: undefined, error: null, isLoading: false, refetch: vi.fn() });

    render(<ReservationCenter propertyId="GT-HB-01" />);

    expect(screen.getByText(/contrato API/i)).toBeInTheDocument();
  });

  it("presents a dedicated offline message and offers a retry", () => {
    const refetch = vi.fn();
    useReservationCenterMock.mockReturnValue({ data: undefined, error: new HttpNetworkError(), isLoading: false, refetch });

    render(<ReservationCenter propertyId="GT-HB-01" endpoint="http://pms.test/contract/reservations" />);

    expect(screen.getByText(/sin conexión/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("renders the empty state for an explicit scope", () => {
    useReservationCenterMock.mockReturnValue({
      data: { summary: centerData().summary, alerts: [], reservations: [] },
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(<ReservationCenter propertyId="GT-HB-01" endpoint="http://pms.test/contract/reservations" />);

    expect(screen.getByText("No hay reservas para esta propiedad.")).toBeInTheDocument();
  });

  it("renders KPIs, alerts and the reservation list", () => {
    useReservationCenterMock.mockReturnValue({ data: centerData(), error: null, isLoading: false, refetch: vi.fn() });

    render(<ReservationCenter propertyId="GT-HB-01" endpoint="http://pms.test/contract/reservations" />);

    expect(screen.getByRole("heading", { name: "Centro de Reservas" })).toBeInTheDocument();
    expect(screen.getByText("Llegadas hoy")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText("Salidas hoy")).toBeInTheDocument();
    expect(screen.getByText("126")).toBeInTheDocument();
    expect(screen.getByText("Alertas")).toBeInTheDocument();
    expect(screen.getByText("Confirmadas próximas")).toBeInTheDocument();
    expect(screen.getByText("37")).toBeInTheDocument();
    expect(screen.getByText(/No-show pendiente · HB-2026-08458/i)).toBeInTheDocument();
    expect(screen.getByText("HB-2026-08421")).toBeInTheDocument();
  });
});