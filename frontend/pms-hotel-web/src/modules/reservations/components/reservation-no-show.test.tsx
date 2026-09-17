import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError, HttpStatusError } from "@/lib/http/errors";

import { ReservationNoShow } from "./reservation-no-show";

afterEach(() => cleanup());

const { useNoShowPreviewMock, useApplyNoShowMock } = vi.hoisted(() => ({
  useNoShowPreviewMock: vi.fn(),
  useApplyNoShowMock: vi.fn(),
}));

vi.mock("../hooks/use-reservation-no-show", () => ({
  useNoShowPreview: useNoShowPreviewMock,
  useApplyNoShow: useApplyNoShowMock,
}));

function previewData(overrides: Record<string, unknown> = {}) {
  return {
    reservationId: "HB-2026-08112",
    policySummary: "No-show: cargo de una noche + impuestos.",
    cutoffAt: new Date(2026, 7, 27, 18, 0),
    allowedCharge: 470,
    releaseNote: "Estándar Doble 101 · 27–29 ago",
    canMarkNoShow: true,
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
  useApplyNoShowMock.mockReturnValue(apply);

  const view = render(<ReservationNoShow propertyId="GT-HB-01" endpoint="http://pms.test/contract/reservations" reservationId="HB-2026-08112" onClose={onClose} />);

  return { onClose };
}

describe("ReservationNoShow", () => {
  beforeEach(() => {
    useNoShowPreviewMock.mockReset();
    useApplyNoShowMock.mockReset();
  });

  it("consults the policy before allowing any action", () => {
    useNoShowPreviewMock.mockReturnValue(previewResult({ data: undefined, isLoading: true }));
    renderPanel();

    expect(screen.getByText(/Consultando política de no-show…/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirmar no-show" })).not.toBeInTheDocument();
  });

  it("shows the policy, projected charge and release before confirming", () => {
    useNoShowPreviewMock.mockReturnValue(previewResult());
    renderPanel();

    expect(screen.getByText("Política aplicable")).toBeInTheDocument();
    expect(screen.getByText(/cargo de una noche/)).toBeInTheDocument();
    expect(screen.getByText("Cargo permitido")).toBeInTheDocument();
    expect(screen.getByText("Q470")).toBeInTheDocument();
    expect(screen.getByText(/Inventario: Estándar Doble 101 · 27–29 ago\./)).toBeInTheDocument();
    expect(screen.getByText(/método de garantía autorizado/)).toBeInTheDocument();
  });

  it("does not allow the action when the policy blocks it", () => {
    useNoShowPreviewMock.mockReturnValue(previewResult({
      data: previewData({ canMarkNoShow: false, reason: "La reserva ya fue cancelada." }),
    }));
    renderPanel();

    expect(screen.getByText("No se puede marcar como no-show")).toBeInTheDocument();
    expect(screen.getByText(/La reserva ya fue cancelada/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirmar no-show" })).not.toBeInTheDocument();
  });

  it("offers a retry when the policy preview fails", () => {
    const refetch = vi.fn();
    useNoShowPreviewMock.mockReturnValue(previewResult({ data: undefined, error: new HttpNetworkError(), refetch }));
    renderPanel();

    expect(screen.getByText("Sin conexión.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("opens the dialog first and only applies after explicit confirmation", () => {
    useNoShowPreviewMock.mockReturnValue(previewResult());
    const apply = applyResult();
    renderPanel(apply);

    fireEvent.click(screen.getByRole("button", { name: "Confirmar no-show" }));
    expect(apply.mutate).not.toHaveBeenCalled();

    const dialog = screen.getByRole("dialog");
    expect(screen.getByRole("heading", { name: "Confirmar no-show" })).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Confirmar no-show" }));
    expect(apply.mutate).toHaveBeenCalledTimes(1);
  });

  it("can keep the reservation from the dialog without applying", () => {
    useNoShowPreviewMock.mockReturnValue(previewResult());
    const apply = applyResult();
    renderPanel(apply);

    fireEvent.click(screen.getByRole("button", { name: "Confirmar no-show" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Volver" }));

    expect(apply.mutate).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the completed no-show as evidence with charge and inventory release", () => {
    useNoShowPreviewMock.mockReturnValue(previewResult());
    const apply = applyResult({
      isSuccess: true,
      data: {
        reservationId: "HB-2026-08112",
        status: "NO_SHOW",
        markedAt: new Date(2026, 7, 28, 18, 15),
        allowedCharge: 470,
        message: "No-show: cargo Q470 · ATS +1/noche · AuditTrail RESERVATION_NO_SHOW",
      },
    });
    const { onClose } = renderPanel(apply);

    expect(screen.getByText("No-show registrado")).toBeInTheDocument();
    expect(screen.getByText(/No-show: cargo Q470/)).toBeInTheDocument();
    expect(screen.getByText(/inventario liberado/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("preserves the original on a failed apply and demands revalidation, not a blind retry", () => {
    useNoShowPreviewMock.mockReturnValue(previewResult());
    const reset = vi.fn();
    const refetch = vi.fn();
    useNoShowPreviewMock.mockReturnValue(previewResult({ refetch }));
    const apply = applyResult({ isError: true, error: new HttpStatusError(409, "CONFLICT"), reset });
    renderPanel(apply);

    expect(screen.getByText(/No se pudo registrar el no-show\./)).toBeInTheDocument();
    expect(screen.getByText(/conserva su estado/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Volver a revalidar" }));
    expect(reset).toHaveBeenCalled();
    expect(refetch).toHaveBeenCalled();
  });
});