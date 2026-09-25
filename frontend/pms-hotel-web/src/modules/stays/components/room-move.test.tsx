import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError, HttpStatusError } from "@/lib/http/errors";

import { RoomMove } from "./room-move";

afterEach(() => cleanup());

const { useRoomMovePreviewMock, useApplyRoomMoveMock } = vi.hoisted(() => ({
  useRoomMovePreviewMock: vi.fn(),
  useApplyRoomMoveMock: vi.fn(),
}));

vi.mock("../hooks/use-room-move", () => ({
  useRoomMovePreview: useRoomMovePreviewMock,
  useApplyRoomMove: useApplyRoomMoveMock,
}));

const CANDIDATE_101 = {
  roomId: "ROOM-101",
  roomLabel: "101",
  roomType: "Deluxe King",
  isCompatible: true,
  compatibilityNote: "mismo room type y capacidad",
  availabilityState: "AVAILABLE",
  availabilityNote: "limpia y verificada",
};

const CANDIDATE_204 = {
  roomId: "ROOM-204",
  roomLabel: "204",
  roomType: "Deluxe King",
  isCompatible: true,
  compatibilityNote: "mismo room type y capacidad",
  availabilityState: "OCCUPIED",
  availabilityNote: null,
};

function previewData(overrides: Record<string, unknown> = {}) {
  return {
    reservationId: "HB-2026-08421",
    stayId: "STAY-2026-08421-A",
    guestName: "María López",
    currentRoom: { roomId: "ROOM-203", roomLabel: "203", roomType: "Deluxe King" },
    candidates: [CANDIDATE_101, CANDIDATE_204],
    financeSummary: { totalAmount: 3920, paidAmount: 2400, balanceAmount: 1520, currency: "GTQ", paidCount: 2, totalCount: 5 },
    hkImpact: {
      fromRoomState: "POR LIMPIAR",
      toRoomState: "OCUPADA",
      note: "Housekeeping recibe la transición; ReservationStay cambia room_id y conserva historial.",
    },
    folioNote: "Mismo folio y cargos · no se crea un segundo folio.",
    canMove: true,
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
  useApplyRoomMoveMock.mockReturnValue(apply);

  const view = render(
    <RoomMove
      propertyId="GT-HB-01"
      endpoint="http://pms.test/contract/reservations"
      reservationId="HB-2026-08421"
      stayId="STAY-2026-08421-A"
      onClose={onClose}
    />,
  );

  return { onClose };
}

describe("RoomMove", () => {
  beforeEach(() => {
    useRoomMovePreviewMock.mockReset();
    useApplyRoomMoveMock.mockReset();
  });

  it("consults the preview before allowing any action", () => {
    useRoomMovePreviewMock.mockReturnValue(previewResult({ data: undefined, isLoading: true }));
    renderPanel();

    expect(screen.getByText(/Consultando opciones de cambio de habitación…/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirmar cambio" })).not.toBeInTheDocument();
  });

  it("renders candidates, finance, folio and the HK impact before confirming", () => {
    useRoomMovePreviewMock.mockReturnValue(previewResult());
    renderPanel();

    expect(screen.getByText("María López · estancia activa · Hab. 203 → Hab. —")).toBeInTheDocument();
    expect(screen.getByText("Total actual")).toBeInTheDocument();
    expect(screen.getByText("Q3,920 · 5 cargos")).toBeInTheDocument();
    expect(screen.getByText("Q2,400 · 2 pagos")).toBeInTheDocument();
    expect(screen.getByText("Q1,520")).toBeInTheDocument();

    expect(screen.getByText("101 · Deluxe King")).toBeInTheDocument();
    expect(screen.getByText("204 · Deluxe King")).toBeInTheDocument();
    expect(screen.getAllByText(/Compatibilidad: mismo room type y capacidad · PASS/)).toHaveLength(2);
    expect(screen.getByText("AVAILABLE · limpia y verificada")).toBeInTheDocument();
    expect(screen.getByText("OCCUPIED")).toBeInTheDocument();

    expect(screen.getByText("Folio y tarifa")).toBeInTheDocument();
    expect(screen.getByText(/Mismo folio y cargos · no se crea un segundo folio\./)).toBeInTheDocument();

    expect(screen.getByText("Impacto operativo")).toBeInTheDocument();
    expect(screen.getByText(/203 → POR LIMPIAR · — → OCUPADA\./)).toBeInTheDocument();
    expect(screen.getByText(/Housekeeping recibe la transición/)).toBeInTheDocument();
  });

  it("does not allow the action when Backend blocks the move", () => {
    useRoomMovePreviewMock.mockReturnValue(previewResult({
      data: previewData({ canMove: false, reason: "La estadía está por salir; no se puede mover." }),
    }));
    renderPanel();

    expect(screen.getByText("No se puede cambiar de habitación")).toBeInTheDocument();
    expect(screen.getByText(/La estadía está por salir/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirmar cambio" })).not.toBeInTheDocument();
  });

  it("offers a retry when the preview fails", () => {
    const refetch = vi.fn();
    useRoomMovePreviewMock.mockReturnValue(previewResult({ data: undefined, error: new HttpNetworkError(), refetch }));
    renderPanel();

    expect(screen.getByText("Sin conexión.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("selects a compatible candidate and confirms only after explicit dialog confirmation", () => {
    useRoomMovePreviewMock.mockReturnValue(previewResult());
    const apply = applyResult();
    renderPanel(apply);

    fireEvent.click(screen.getByRole("radio", { name: /101 · Deluxe King/ }));

    expect(screen.getByText("María López · estancia activa · Hab. 203 → Hab. 101")).toBeInTheDocument();
    expect(screen.getByText(/203 → POR LIMPIAR · 101 → OCUPADA\./)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirmar cambio" }));
    expect(apply.mutate).not.toHaveBeenCalled();

    const dialog = screen.getByRole("dialog");
    expect(screen.getByRole("heading", { name: "Confirmar cambio de habitación" })).toBeInTheDocument();
    expect(within(dialog).getByText(/se revalida nuevamente/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Confirmar cambio" }));
    expect(apply.mutate).toHaveBeenCalledWith({ targetRoomId: "ROOM-101", reason: null });
  });

  it("sends the typed reason with the move", () => {
    useRoomMovePreviewMock.mockReturnValue(previewResult());
    const apply = applyResult();
    renderPanel(apply);

    fireEvent.change(screen.getByLabelText("Motivo del cambio de habitación"), {
      target: { value: "solicitud de habitación tranquila" },
    });
    fireEvent.click(screen.getByRole("radio", { name: /101 · Deluxe King/ }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar cambio" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirmar cambio" }));

    expect(apply.mutate).toHaveBeenCalledWith({
      targetRoomId: "ROOM-101",
      reason: "solicitud de habitación tranquila",
    });
  });

  it("can keep the reservation room from the dialog without applying", () => {
    useRoomMovePreviewMock.mockReturnValue(previewResult());
    const apply = applyResult();
    renderPanel(apply);

    fireEvent.click(screen.getByRole("radio", { name: /101 · Deluxe King/ }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar cambio" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Volver" }));

    expect(apply.mutate).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the completed ROOM_MOVED as evidence with HK transition and audit", () => {
    useRoomMovePreviewMock.mockReturnValue(previewResult());
    const apply = applyResult({
      isSuccess: true,
      data: {
        reservationId: "HB-2026-08421",
        stayId: "STAY-2026-08421-A",
        status: "ROOM_MOVED",
        fromRoomId: "ROOM-203",
        toRoomId: "ROOM-101",
        movedAt: new Date(2026, 7, 29, 11, 30),
        hkTransition: "203 → POR LIMPIAR · 101 → OCUPADA",
        auditSummary: "ROOM_MOVED 203→101 · ReservationStay actualizado · Folio y cargos conservados",
        message: "HK: 203→POR LIMPIAR · 101→OCUPADA · Inventario: asignación 203→101 · ATS neto sin cambio · AuditTrail ROOM_MOVED",
      },
    });
    const { onClose } = renderPanel(apply);

    expect(screen.getByText("Cambio de habitación registrado")).toBeInTheDocument();
    expect(screen.getByText(/ROOM_MOVED 203→101/)).toBeInTheDocument();
    expect(screen.getByText(/HK: 203→POR LIMPIAR/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("preserves the original on a failed apply and demands revalidation, not a blind retry", () => {
    const refetch = vi.fn();
    useRoomMovePreviewMock.mockReturnValue(previewResult({ refetch }));
    const reset = vi.fn();
    const apply = applyResult({ isError: true, error: new HttpStatusError(409, "CONFLICT"), reset });
    renderPanel(apply);

    expect(screen.getByText(/No se pudo confirmar el cambio de habitación\./)).toBeInTheDocument();
    expect(screen.getByText(/conserva su habitación/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Volver a revalidar" }));
    expect(reset).toHaveBeenCalled();
    expect(refetch).toHaveBeenCalled();
  });

  it("filters candidates by the search input", () => {
    useRoomMovePreviewMock.mockReturnValue(previewResult());
    renderPanel();

    fireEvent.change(screen.getByLabelText("Buscar habitación"), { target: { value: "204" } });

    expect(screen.queryByText("101 · Deluxe King")).not.toBeInTheDocument();
    expect(screen.getByText("204 · Deluxe King")).toBeInTheDocument();
  });
});