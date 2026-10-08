import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError, HttpStatusError } from "@/lib/http/errors";

import { ReservationCancellation } from "./reservation-cancellation";

afterEach(() => cleanup());

const { useCancellationPreviewMock, useApplyCancellationMock } = vi.hoisted(() => ({
  useCancellationPreviewMock: vi.fn(),
  useApplyCancellationMock: vi.fn(),
}));

vi.mock("../hooks/use-reservation-cancellation", () => ({
  useCancellationPreview: useCancellationPreviewMock,
  useApplyCancellation: useApplyCancellationMock,
}));

function previewData(overrides: Record<string, unknown> = {}) {
  return {
    reservationId: "HB-2026-08421",
    policySummary: "Flexible 48h · Viajes Maya: hasta 48h antes cancelación gratuita.",
    cutoffAt: new Date(2026, 7, 26, 15, 0),
    penaltyAmount: 1160,
    refundAmount: 0,
    releaseNote: "Deluxe King 203 · 28–31 ago",
    canCancel: true,
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
  useApplyCancellationMock.mockReturnValue(apply);

  const view = render(<ReservationCancellation propertyId="GT-HB-01" endpoint="http://pms.test/contract/reservations" reservationId="HB-2026-08421" currency="GTQ" onClose={onClose} />);

  return { onClose };
}

describe("ReservationCancellation", () => {
  beforeEach(() => {
    useCancellationPreviewMock.mockReset();
    useApplyCancellationMock.mockReset();
  });

  it("consults the policy before allowing any action", () => {
    useCancellationPreviewMock.mockReturnValue(previewResult({ data: undefined, isLoading: true }));
    renderPanel();

    expect(screen.getByText(/Consultando política de cancelación…/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar reserva" })).not.toBeInTheDocument();
  });

  it("shows the policy, projected penalty/refund and release before confirming", () => {
    useCancellationPreviewMock.mockReturnValue(previewResult());
    renderPanel();

    expect(screen.getByText("Política aplicable")).toBeInTheDocument();
    expect(screen.getByText(/hasta 48h antes cancelación gratuita/)).toBeInTheDocument();
    expect(screen.getByText("Penalización")).toBeInTheDocument();
    expect(screen.getByText("Q1,160")).toBeInTheDocument();
    expect(screen.getByText("Reembolso estimado")).toBeInTheDocument();
    expect(screen.getByText(/Inventario: Deluxe King 203 · 28–31 ago\./)).toBeInTheDocument();
    expect(screen.getByText(/método de garantía autorizado/)).toBeInTheDocument();
  });

  it("does not allow cancellation when the policy blocks it", () => {
    useCancellationPreviewMock.mockReturnValue(previewResult({
      data: previewData({ canCancel: false, reason: "Fuera de ventana: penalización 100%." }),
    }));
    renderPanel();

    expect(screen.getByText("La reserva no se puede cancelar")).toBeInTheDocument();
    expect(screen.getByText(/Fuera de ventana/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar reserva" })).not.toBeInTheDocument();
  });

  it("offers a retry when the policy preview fails", () => {
    const refetch = vi.fn();
    useCancellationPreviewMock.mockReturnValue(previewResult({ data: undefined, error: new HttpNetworkError(), refetch }));
    renderPanel();

    expect(screen.getByText("Sin conexión.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("requires a reason before confirming the cancellation", () => {
    useCancellationPreviewMock.mockReturnValue(previewResult());
    const apply = applyResult();
    renderPanel(apply);

    fireEvent.click(screen.getByRole("button", { name: "Cancelar reserva" }));

    const dialog = screen.getByRole("dialog");
    expect(screen.getByRole("heading", { name: "Confirmar cancelación" })).toBeInTheDocument();

    const confirmButton = within(dialog).getByRole("button", { name: "Confirmar cancelación" });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText(/Motivo de cancelación/), { target: { value: "Cambio de planes del huésped" } });
    expect(confirmButton).toBeEnabled();

    fireEvent.click(confirmButton);
    expect(apply.mutate).toHaveBeenCalledWith("Cambio de planes del huésped");
  });

  it("can keep the reservation from the dialog without cancelling", () => {
    useCancellationPreviewMock.mockReturnValue(previewResult());
    const apply = applyResult();
    renderPanel(apply);

    fireEvent.click(screen.getByRole("button", { name: "Cancelar reserva" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Volver" }));

    expect(apply.mutate).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the completed cancellation as evidence with refund and inventory release", () => {
    useCancellationPreviewMock.mockReturnValue(previewResult());
    const apply = applyResult({
      isSuccess: true,
      data: {
        reservationId: "HB-2026-08421",
        status: "CANCELLED",
        cancelledAt: new Date(2026, 7, 28, 9, 30),
        penaltyAmount: 1160,
        refundAmount: 0,
        message: "Penalty Charge Q1,160 · Refund Q 0 · ATS +1/noche · AuditTrail RESERVATION_CANCELLED",
      },
    });
    const { onClose } = renderPanel(apply);

    expect(screen.getByText("Cancelación completada")).toBeInTheDocument();
    expect(screen.getByText(/Penalty Charge Q1,160 · Refund Q 0/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("preserves the original on a failed apply and demands revalidation, not a blind retry", () => {
    useCancellationPreviewMock.mockReturnValue(previewResult());
    const reset = vi.fn();
    const refetch = vi.fn();
    useCancellationPreviewMock.mockReturnValue(previewResult({ refetch }));
    const apply = applyResult({ isError: true, error: new HttpStatusError(409, "CONFLICT"), reset });
    renderPanel(apply);

    expect(screen.getByText(/No se pudo cancelar la reserva\./)).toBeInTheDocument();
    expect(screen.getByText(/conserva su estado/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Volver a revalidar" }));
    expect(reset).toHaveBeenCalled();
    expect(refetch).toHaveBeenCalled();
  });
});