import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError } from "@/lib/http/errors";

import { ReservationDetail } from "./reservation-detail";

afterEach(() => cleanup());

const { useReservationDetailMock } = vi.hoisted(() => ({ useReservationDetailMock: vi.fn() }));

vi.mock("../hooks/use-reservation-detail", () => ({ useReservationDetail: useReservationDetailMock }));

function detailData() {
  return {
    id: "HB-2026-08421",
    propertyId: "GT-HB-01",
    status: "CONFIRMED",
    createdAt: new Date(2026, 7, 24),
    source: { label: "Viajes Maya", reference: "VM-77821 · TA-MAYA-01" },
    policyLabel: "Flexible 48h · Viajes Maya",
    guest: { primaryName: "María López", phone: "+502 5555 5555", adults: 2, children: null },
    stays: [{
      id: "STAY-001",
      roomId: "RM-203",
      roomLabel: "203",
      roomType: "Deluxe King",
      checkIn: new Date(2026, 7, 28),
      checkOut: new Date(2026, 7, 31),
      nights: 3,
      travelState: "RESERVED",
    }],
    notes: "Llegada estimada 15:00. Solicita habitación tranquila.",
    currency: "GTQ",
    finance: {
      totalAmount: 3920,
      paidAmount: 2400,
      financeState: "BALANCE",
      ratePerNight: 1160,
      lines: [
        { label: "Habitación · 3 noches", amount: 3480 },
        { label: "Impuestos", amount: 240 },
        { label: "Servicio", amount: 200 },
      ],
    },
  };
}

describe("ReservationDetail", () => {
  it("does not query until composition supplies an authorized scope", () => {
    useReservationDetailMock.mockReturnValue({ data: undefined, error: null, isLoading: false, refetch: vi.fn() });

    render(<ReservationDetail reservationId="HB-2026-08421" />);

    expect(screen.getByText(/scope de propiedad autorizado/i)).toBeInTheDocument();
  });

  it("waits for the approved endpoint before querying", () => {
    useReservationDetailMock.mockReturnValue({ data: undefined, error: null, isLoading: false, refetch: vi.fn() });

    render(<ReservationDetail propertyId="GT-HB-01" reservationId="HB-2026-08421" />);

    expect(screen.getByText(/contrato API/i)).toBeInTheDocument();
  });

  it("asks to select a reservation when the id is missing", () => {
    useReservationDetailMock.mockReturnValue({ data: undefined, error: null, isLoading: false, refetch: vi.fn() });

    render(<ReservationDetail propertyId="GT-HB-01" endpoint="http://pms.test/contract/reservations" />);

    expect(screen.getByText(/selecciona una reserva/i)).toBeInTheDocument();
  });

  it("presents a dedicated offline message and offers a retry", () => {
    const refetch = vi.fn();
    useReservationDetailMock.mockReturnValue({ data: undefined, error: new HttpNetworkError(), isLoading: false, refetch });

    render(
      <ReservationDetail propertyId="GT-HB-01" endpoint="http://pms.test/contract/reservations" reservationId="HB-2026-08421" />,
    );

    expect(screen.getByText(/sin conexión/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("renders booking guest, stays, status, source and the financial summary", () => {
    useReservationDetailMock.mockReturnValue({ data: detailData(), error: null, isLoading: false, refetch: vi.fn() });

    render(
      <ReservationDetail propertyId="GT-HB-01" endpoint="http://pms.test/contract/reservations" reservationId="HB-2026-08421" />,
    );

    expect(screen.getByRole("heading", { name: "Reserva HB-2026-08421" })).toBeInTheDocument();
    expect(screen.getByText("Confirmada")).toBeInTheDocument();
    expect(screen.getByText(/Origen: Viajes Maya · VM-77821 · TA-MAYA-01/i)).toBeInTheDocument();
    expect(screen.getByText("María López")).toBeInTheDocument();
    expect(screen.getByText("2 adultos")).toBeInTheDocument();
    expect(screen.getByText("+502 5555 5555")).toBeInTheDocument();
    expect(screen.getByText("Q1,160 / noche")).toBeInTheDocument();
    expect(screen.getByText("Flexible 48h · Viajes Maya")).toBeInTheDocument();
    expect(screen.getByText(/Solicita habitación tranquila/)).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Resumen financiero" })).toBeInTheDocument();
    expect(screen.getByText("Habitación · 3 noches")).toBeInTheDocument();
    expect(screen.getByText("Q3,480")).toBeInTheDocument();
    expect(screen.getByText("Total original")).toBeInTheDocument();
    expect(screen.getByText("Q3,920")).toBeInTheDocument();
    expect(screen.getByText("Pendiente Q1,520")).toBeInTheDocument();
    expect(screen.getByText(/módulo Folio \(API pública\)/i)).toBeInTheDocument();
  });

  it("renders every stay for a multi-room reservation", () => {
    const data = detailData();
    data.stays = [
      detailData().stays[0],
      {
        id: "STAY-002",
        roomId: "RM-101",
        roomLabel: "101",
        roomType: "Deluxe King",
        checkIn: new Date(2026, 7, 28),
        checkOut: new Date(2026, 7, 31),
        nights: 3,
        travelState: "IN_HOUSE",
      },
    ];
    useReservationDetailMock.mockReturnValue({ data, error: null, isLoading: false, refetch: vi.fn() });

    render(
      <ReservationDetail propertyId="GT-HB-01" endpoint="http://pms.test/contract/reservations" reservationId="HB-2026-08421" />,
    );

    expect(screen.getByText("Habitaciones")).toBeInTheDocument();
    expect(screen.getByText("203 · Deluxe King")).toBeInTheDocument();
    expect(screen.getByText("101 · Deluxe King")).toBeInTheDocument();
    expect(screen.getByText("En casa")).toBeInTheDocument();
  });
});