import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError, HttpStatusError } from "@/lib/http/errors";

import { StayExtension } from "./stay-extension";

afterEach(() => cleanup());

const { useExtensionPreviewMock, useApplyStayExtensionMock } = vi.hoisted(() => ({
  useExtensionPreviewMock: vi.fn(),
  useApplyStayExtensionMock: vi.fn(),
}));

vi.mock("../hooks/use-stay-extension", () => ({
  useExtensionPreview: useExtensionPreviewMock,
  useApplyStayExtension: useApplyStayExtensionMock,
}));

function previewData(overrides: Record<string, unknown> = {}) {
  return {
    reservationId: "HB-2026-08421",
    stayId: "STAY-2026-08421-A",
    guestName: "María Fernández",
    currentStay: {
      roomLabel: "203",
      roomType: "Deluxe King",
      checkIn: new Date(2026, 7, 28),
      checkOut: new Date(2026, 7, 31),
      nights: 3,
    },
    requestedDeparture: new Date(2026, 8, 2),
    extraNights: 2,
    ratePerNight: 1160,
    rateConfirmed: true,
    rateConfirmation: "Tarifa Deluxe King · 1,160 GTQ/noche confirmada.",
    availabilityConfirmed: true,
    availabilityNote: "Deluxe King 203 disponible · 31 ago – 2 sep.",
    deltaAmount: 2320,
    newTotalAmount: 5800,
    currency: "GTQ",
    inventoryNote: "ReservationStay A · 28 ago → 2 sep · ATS -2/noche.",
    calendarNote: "Calendario: 203 reservada hasta 2 sep.",
    folioNote: "Mismo folio · se agrega cargo por 2 noches adicionales.",
    canExtend: true,
    reason: null,
    ...overrides,
  };
}

function previewResult(overrides: Record<string, unknown> = {}) {
  return { data: previewData(), error: null, isLoading: false, refetch: vi.fn(), ...overrides };
}

function applyResult(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    error: null,
    isError: false,
    isPending: false,
    isSuccess: false,
    mutate: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  };
}

function renderPanel(apply = applyResult()) {
  const onClose = vi.fn();
  useApplyStayExtensionMock.mockReturnValue(apply);

  const view = render(
    <StayExtension
      propertyId="GT-HB-01"
      endpoint="http://pms.test/contract/reservations"
      reservationId="HB-2026-08421"
      stayId="STAY-2026-08421-A"
      onClose={onClose}
    />,
  );

  return { onClose };
}

describe("StayExtension", () => {
  beforeEach(() => {
    useExtensionPreviewMock.mockReset();
    useApplyStayExtensionMock.mockReset();
  });

  it("requires a departure date before revalidating availability", () => {
    useExtensionPreviewMock.mockReturnValue(previewResult());
    renderPanel();

    expect(screen.getByLabelText("Nueva fecha de salida")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revalidar disponibilidad" })).toBeDisabled();
  });

  it("revalidates and renders the projection for the chosen departure", () => {
    useExtensionPreviewMock.mockReturnValue(previewResult());
    renderPanel();

    fireEvent.change(screen.getByLabelText("Nueva fecha de salida"), { target: { value: "2026-09-02" } });

    expect(screen.getByRole("button", { name: "Revalidar disponibilidad" })).toBeEnabled();

    expect(screen.getByText("María Fernández · 203 · Deluxe King · salida actual 31 ago 2026")).toBeInTheDocument();
    expect(screen.getByText("Salida solicitada")).toBeInTheDocument();
    expect(screen.getByText("2 noches")).toBeInTheDocument();
    expect(screen.getByText("Q1,160 / noche · confirmada")).toBeInTheDocument();
    expect(screen.getByText("Q2,320")).toBeInTheDocument();
    expect(screen.getByText("Q5,800")).toBeInTheDocument();

    expect(screen.getByText("Disponibilidad y tarifa")).toBeInTheDocument();
    expect(screen.getByText(/Deluxe King 203 disponible/)).toBeInTheDocument();
    expect(screen.getByText("Inventario y calendario")).toBeInTheDocument();
    expect(screen.getByText(/ReservationStay A · 28 ago → 2 sep/)).toBeInTheDocument();
    expect(screen.getByText("Folio")).toBeInTheDocument();
    expect(screen.getByText(/Mismo folio · se agrega cargo/)).toBeInTheDocument();
  });

  it("shows the consultation state while revalidating", () => {
    useExtensionPreviewMock.mockReturnValue(previewResult({ data: undefined, isLoading: true }));
    renderPanel();

    expect(screen.getByText(/Revalidando disponibilidad y tarifa…/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirmar extensión" })).not.toBeInTheDocument();
  });

  it("does not allow the action when Backend blocks the extension", () => {
    useExtensionPreviewMock.mockReturnValue(previewResult({
      data: previewData({ canExtend: false, reason: "La estadía está por salir; no se puede extender." }),
    }));
    renderPanel();

    expect(screen.getByText("No se puede extender la estadía")).toBeInTheDocument();
    expect(screen.getByText(/La estadía está por salir/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirmar extensión" })).not.toBeInTheDocument();
  });

  it("offers a retry when the preview fails", () => {
    const refetch = vi.fn();
    useExtensionPreviewMock.mockReturnValue(previewResult({ data: undefined, error: new HttpNetworkError(), refetch }));
    renderPanel();

    expect(screen.getByText("Sin conexión.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("confirms the extension only after explicit dialog confirmation", () => {
    useExtensionPreviewMock.mockReturnValue(previewResult());
    const apply = applyResult();
    renderPanel(apply);

    fireEvent.change(screen.getByLabelText("Nueva fecha de salida"), { target: { value: "2026-09-02" } });
    fireEvent.click(screen.getByRole("button", { name: "Revalidar disponibilidad" }));

    fireEvent.click(screen.getByRole("button", { name: "Confirmar extensión" }));
    expect(apply.mutate).not.toHaveBeenCalled();

    const dialog = screen.getByRole("dialog");
    expect(screen.getByRole("heading", { name: "Confirmar extensión" })).toBeInTheDocument();
    expect(within(dialog).getByText(/31 ago 2026/)).toBeInTheDocument();
    expect(within(dialog).getByText(/se revalida nuevamente/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Confirmar extensión" }));
    expect(apply.mutate).toHaveBeenCalledWith({ newDeparture: "2026-09-02", reason: null });
  });

  it("sends the typed reason with the extension", () => {
    useExtensionPreviewMock.mockReturnValue(previewResult());
    const apply = applyResult();
    renderPanel(apply);

    fireEvent.change(screen.getByLabelText("Nueva fecha de salida"), { target: { value: "2026-09-02" } });
    fireEvent.change(screen.getByLabelText("Motivo de la extensión"), { target: { value: "evento ampliado" } });
    fireEvent.click(screen.getByRole("button", { name: "Revalidar disponibilidad" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar extensión" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirmar extensión" }));

    expect(apply.mutate).toHaveBeenCalledWith({ newDeparture: "2026-09-02", reason: "evento ampliado" });
  });

  it("can keep the current departure from the dialog without applying", () => {
    useExtensionPreviewMock.mockReturnValue(previewResult());
    const apply = applyResult();
    renderPanel(apply);

    fireEvent.change(screen.getByLabelText("Nueva fecha de salida"), { target: { value: "2026-09-02" } });
    fireEvent.click(screen.getByRole("button", { name: "Revalidar disponibilidad" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar extensión" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Volver" }));

    expect(apply.mutate).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the completed EXTENDED as evidence with the new departure and audit", () => {
    useExtensionPreviewMock.mockReturnValue(previewResult());
    const apply = applyResult({
      isSuccess: true,
      data: {
        reservationId: "HB-2026-08421",
        stayId: "STAY-2026-08421-A",
        status: "EXTENDED",
        previousDeparture: new Date(2026, 7, 31),
        newDeparture: new Date(2026, 8, 2),
        extraNights: 2,
        nights: 5,
        ratePerNight: 1160,
        deltaAmount: 2320,
        extendedAt: new Date(2026, 7, 29, 11, 30),
        auditSummary: "EXTENDED 31 ago → 2 sep · ReservationStay actualizado · Inventario y calendario actualizados",
        message: "Cargo adicional Q2,320 · ATS -2/noche · AuditTrail STAY_EXTENDED",
      },
    });
    const { onClose } = renderPanel(apply);

    expect(screen.getByText("Extensión registrada")).toBeInTheDocument();
    expect(screen.getByText(/31 ago 2026 → 2 sep 2026/)).toBeInTheDocument();
    expect(screen.getByText(/EXTENDED 31 ago → 2 sep/)).toBeInTheDocument();
    expect(screen.getByText(/Cargo adicional Q2,320/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("preserves the original departure on a failed apply and demands revalidation, not a blind retry", () => {
    const refetch = vi.fn();
    useExtensionPreviewMock.mockReturnValue(previewResult({ refetch }));
    const reset = vi.fn();
    const apply = applyResult({ isError: true, error: new HttpStatusError(409, "CONFLICT"), reset });
    renderPanel(apply);

    expect(screen.getByText(/No se pudo confirmar la extensión\./)).toBeInTheDocument();
    expect(screen.getByText(/conserva su salida actual/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Volver a revalidar" }));
    expect(reset).toHaveBeenCalled();
    expect(refetch).toHaveBeenCalled();
  });
});