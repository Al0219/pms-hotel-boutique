import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { ReservationListItem } from "../model/reservation-summary";
import { ReservationList } from "./reservation-list";

afterEach(() => cleanup());

function reservation(overrides: Partial<ReservationListItem> = {}): ReservationListItem {
  return {
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
    ...overrides,
  };
}

function waitlistReservation(): ReservationListItem {
  return reservation({
    id: "WAIT-0007",
    guestName: "Laura Méndez",
    sourceLabel: "Web directa",
    sourceReference: null,
    roomLabel: "Deluxe King",
    roomCount: null,
    finance: { totalAmount: 2250, paidAmount: null, financeState: "ESTIMATED" },
    alertText: "3 solicitudes en cola",
    status: "WAITLIST",
    statusDetail: "Sin inventario confirmado",
  });
}

describe("ReservationList", () => {
  it("renders table headers and the reservation summary cells", () => {
    render(<ReservationList reservations={[reservation(), waitlistReservation()]} />);

    expect(screen.getByText("Reserva / Huésped")).toBeInTheDocument();
    expect(screen.getByText("Estadía / Canal")).toBeInTheDocument();
    expect(screen.getByText("Finanzas / Alerta")).toBeInTheDocument();
    expect(screen.getByText("Estado")).toBeInTheDocument();

    expect(screen.getByText("HB-2026-08421")).toBeInTheDocument();
    expect(screen.getByText("María López")).toBeInTheDocument();
    expect(screen.getByText("Total Q3,920 · Pendiente Q1,520")).toBeInTheDocument();
    expect(screen.getByText("Confirmada")).toBeInTheDocument();
    expect(screen.getByText("Check-in 28 ago · 15:00")).toBeInTheDocument();
  });

  it("renders waitlist rows without a confirmed room and with estimated tariff", () => {
    render(<ReservationList reservations={[waitlistReservation()]} />);

    expect(screen.getByText("WAIT-0007")).toBeInTheDocument();
    expect(screen.getByText(/2 adultos · solicitud/)).toBeInTheDocument();
    expect(screen.getByText("Tarifa estimada Q2,250")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).getByText("Waitlist")).toBeInTheDocument();
    expect(screen.getByText("Sin inventario confirmado")).toBeInTheDocument();
  });

  it("filters rows by the search query", () => {
    render(<ReservationList reservations={[reservation(), waitlistReservation()]} />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "López" } });

    expect(screen.getByText("HB-2026-08421")).toBeInTheDocument();
    expect(screen.queryByText("WAIT-0007")).not.toBeInTheDocument();
  });

  it("shows an empty result message when search matches nothing", () => {
    render(<ReservationList reservations={[reservation()]} />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzz" } });

    expect(screen.getByText("Sin resultados con los filtros actuales.")).toBeInTheDocument();
  });

  it("filters rows by status", () => {
    render(<ReservationList reservations={[reservation(), waitlistReservation()]} />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "WAITLIST" } });

    expect(screen.getByText("WAIT-0007")).toBeInTheDocument();
    expect(screen.queryByText("HB-2026-08421")).not.toBeInTheDocument();
  });

  it("paginates a list larger than one page", () => {
    const reservations = Array.from({ length: 6 }, (_, index) => reservation({ id: `HB-2026-08${index + 1}`, guestName: `Huésped ${index + 1}` }));
    render(<ReservationList reservations={reservations} />);

    expect(screen.getByText("1–5 de 6 reservas")).toBeInTheDocument();
    expect(screen.getByText("Huésped 1")).toBeInTheDocument();
    expect(screen.queryByText("Huésped 6")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));

    expect(screen.getByText("6–6 de 6 reservas")).toBeInTheDocument();
    expect(screen.getByText("Huésped 6")).toBeInTheDocument();
    expect(screen.queryByText("Huésped 1")).not.toBeInTheDocument();
  });
});