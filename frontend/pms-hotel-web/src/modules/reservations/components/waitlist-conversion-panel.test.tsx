import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError, HttpStatusError } from "@/lib/http/errors";

import { WaitlistConversionPanel } from "./waitlist-conversion-panel";

afterEach(() => cleanup());

const { useWaitlistConversionPreviewMock, useConfirmWaitlistConversionMock } = vi.hoisted(() => ({
  useWaitlistConversionPreviewMock: vi.fn(),
  useConfirmWaitlistConversionMock: vi.fn(),
}));

vi.mock("../hooks/use-waitlist-conversion", () => ({
  useWaitlistConversionPreview: useWaitlistConversionPreviewMock,
  useConfirmWaitlistConversion: useConfirmWaitlistConversionMock,
}));

function previewData(overrides: Record<string, unknown> = {}) {
  return {
    id: "WAIT-0007",
    guestName: "Laura Méndez",
    sourceLabel: "Web directa",
    roomTypeLabel: "Deluxe King",
    checkIn: new Date(2026, 8, 10),
    checkOut: new Date(2026, 8, 12),
    nights: 2,
    adults: 2,
    priority: 1,
    queueLabel: "3 solicitudes en cola",
    preferences: "Habitación tranquila · piso alto si está disponible.",
    originalEstimatedAmount: 2250,
    availability: {
      roomType: "Deluxe King",
      availableFrom: new Date(2026, 8, 10),
      availableUntil: new Date(2026, 8, 12),
      ratePlan: "BAR Flexible",
      ratePerNight: 1125,
      totalEstimated: 2250,
      note: "2 noches · impuestos/servicio según rate plan.",
    },
    ...overrides,
  };
}

function previewResult(overrides: Record<string, unknown> = {}) {
  return { data: previewData(), error: null, isLoading: false, refetch: vi.fn(), ...overrides };
}

function conversionResult(overrides: Record<string, unknown> = {}) {
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

function renderPanel(conversion = conversionResult()) {
  const onClose = vi.fn();
  useConfirmWaitlistConversionMock.mockReturnValue(conversion);

  const view = render(<WaitlistConversionPanel propertyId="GT-HB-01" endpoint="http://pms.test/contract/reservations" waitlistId="WAIT-0007" currency="GTQ" onClose={onClose} />);

  return { onClose };
}

describe("WaitlistConversionPanel", () => {
  beforeEach(() => {
    useWaitlistConversionPreviewMock.mockReset();
    useConfirmWaitlistConversionMock.mockReset();
  });

  it("revalidates availability and keeps the convert action disabled while loading", () => {
    useWaitlistConversionPreviewMock.mockReturnValue(previewResult({ data: undefined, isLoading: true }));
    renderPanel();

    expect(screen.getByText(/Revalidando disponibilidad y tarifa…/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Convertir a reserva" })).toBeDisabled();
  });

  it("shows which waitlist entry is being evaluated", () => {
    useWaitlistConversionPreviewMock.mockReturnValue(previewResult());
    renderPanel();

    expect(screen.getByText("Solicitud WAIT-0007")).toBeInTheDocument();
    expect(screen.getByText("Laura Méndez")).toBeInTheDocument();
  });

  it("presents the revalidated availability and rate before converting", () => {
    useWaitlistConversionPreviewMock.mockReturnValue(previewResult());
    renderPanel();

    expect(screen.getByText("Disponibilidad encontrada")).toBeInTheDocument();
    expect(screen.getByText(/Deluxe King disponible/)).toBeInTheDocument();
    expect(screen.getByText(/BAR Flexible/)).toBeInTheDocument();
    expect(screen.getByText("Q2,250")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Convertir a reserva" })).toBeEnabled();
  });

  it("does not allow converting without revalidated availability", () => {
    useWaitlistConversionPreviewMock.mockReturnValue(previewResult({ data: previewData({ availability: null }) }));
    renderPanel();

    expect(screen.getByText("Disponibilidad no encontrada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Convertir a reserva" })).toBeDisabled();
  });

  it("offers a retry when the preview request fails", () => {
    const refetch = vi.fn();
    useWaitlistConversionPreviewMock.mockReturnValue(previewResult({ data: undefined, error: new HttpNetworkError(), refetch }));
    renderPanel();

    expect(screen.getByText("Sin conexión.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Volver a revalidar" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("confirms the conversion with the revalidated snapshot on submit", () => {
    useWaitlistConversionPreviewMock.mockReturnValue(previewResult());
    const { onClose } = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Convertir a reserva" }));

    expect(useConfirmWaitlistConversionMock).toHaveBeenCalledWith("GT-HB-01", "http://pms.test/contract/reservations", "WAIT-0007");
    const mutate = useConfirmWaitlistConversionMock.mock.results.at(-1)?.value.mutate;
    expect(mutate).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows the created reservation as success evidence", () => {
    useWaitlistConversionPreviewMock.mockReturnValue(previewResult());
    const conversion = conversionResult({
      isSuccess: true,
      data: {
        waitlistId: "WAIT-0007",
        reservationId: "HB-2026-09128",
        status: "CONVERTED",
        message: "disponibilidad/tarifa revalidadas · WAITLIST_CONVERTED",
      },
    });
    const { onClose } = renderPanel(conversion);

    expect(screen.getByText(/WAIT-0007 → HB-2026-09128 · Convertida/)).toBeInTheDocument();
    expect(screen.getByText(/disponibilidad\/tarifa revalidadas/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("demands a revalidation after a failed conversion instead of retrying blind", () => {
    const refetch = vi.fn();
    useWaitlistConversionPreviewMock.mockReturnValue(previewResult({ refetch }));
    const reset = vi.fn();
    const conversion = conversionResult({
      isError: true,
      error: new HttpStatusError(409, "CONFLICT"),
      reset,
    });
    renderPanel(conversion);

    expect(screen.getByText(/No se pudo convertir la reserva\./)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Convertir a reserva" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Volver a revalidar" }));
    expect(reset).toHaveBeenCalled();
    expect(refetch).toHaveBeenCalled();
  });

  it("keeps the entry on the waitlist when the staffer decides to defer", () => {
    useWaitlistConversionPreviewMock.mockReturnValue(previewResult());
    const { onClose } = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Mantener en waitlist" }));

    expect(onClose).toHaveBeenCalled();
  });
});