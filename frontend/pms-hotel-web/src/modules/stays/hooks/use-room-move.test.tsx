import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HttpStatusError } from "@/lib/http/errors";

import { useApplyRoomMove, useRoomMovePreview } from "./use-room-move";

afterEach(() => cleanup());

const { previewRoomMoveMock, applyRoomMoveMock } = vi.hoisted(() => ({
  previewRoomMoveMock: vi.fn(),
  applyRoomMoveMock: vi.fn(),
}));

vi.mock("../service/room-move.service", () => ({
  previewRoomMove: previewRoomMoveMock,
  applyRoomMove: applyRoomMoveMock,
}));

const ENDPOINT = "http://pms.test/contract/reservations";

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return {
    queryClient,
    QueryWrapper: function QueryWrapper({ children }: Readonly<{ children: ReactNode }>) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    },
  };
}

function previewDto() {
  return {
    reservation_id: "HB-2026-08421",
    stay_id: "STAY-2026-08421-A",
    guest_name: "María López",
    current_room: { room_id: "ROOM-203", room_label: "203", room_type: "Deluxe King" },
    candidates: [
      {
        room_id: "ROOM-101",
        room_label: "101",
        room_type: "Deluxe King",
        is_compatible: true,
        compatibility_note: "mismo room type y capacidad",
        availability_state: "AVAILABLE",
        availability_note: "limpia y verificada",
      },
    ],
    finance_summary: { total_amount: "3920", paid_amount: "2400", balance_amount: "1520", currency: "GTQ", paid_count: 2, total_count: 5 },
    hk_impact: {
      from_room_state: "POR LIMPIAR",
      to_room_state: "OCUPADA",
      note: "Housekeeping recibe la transición; ReservationStay cambia room_id y conserva historial.",
    },
    folio_note: "Mismo folio y cargos · no se crea un segundo folio.",
    can_move: true,
    reason: null,
  };
}

function applyDto() {
  return {
    reservation_id: "HB-2026-08421",
    stay_id: "STAY-2026-08421-A",
    status: "ROOM_MOVED",
    from_room_id: "ROOM-203",
    to_room_id: "ROOM-101",
    moved_at: "2026-08-29T11:30:00",
    hk_transition: "203 → POR LIMPIAR · 101 → OCUPADA",
    audit_summary: "ROOM_MOVED 203→101 · ReservationStay actualizado · Folio y cargos conservados",
    message: "HK: 203→POR LIMPIAR · 101→OCUPADA · AuditTrail ROOM_MOVED",
  };
}

describe("useRoomMovePreview", () => {
  beforeEach(() => {
    previewRoomMoveMock.mockReset();
  });

  it("maps the preview only when the panel is open and scope is resolved", async () => {
    previewRoomMoveMock.mockResolvedValueOnce(previewDto());

    const { result } = renderHook(
      () => useRoomMovePreview("GT-HB-01", ENDPOINT, "HB-2026-08421", "STAY-2026-08421-A", true),
      { wrapper: createWrapper().QueryWrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(expect.objectContaining({
      reservationId: "HB-2026-08421",
      stayId: "STAY-2026-08421-A",
      canMove: true,
    }));
    expect(previewRoomMoveMock).toHaveBeenCalledWith(expect.objectContaining({
      endpoint: ENDPOINT,
      propertyId: "GT-HB-01",
      reservationId: "HB-2026-08421",
      stayId: "STAY-2026-08421-A",
    }));
  });

  it("does not request while the panel is closed", () => {
    renderHook(() => useRoomMovePreview("GT-HB-01", ENDPOINT, "HB-2026-08421", "STAY-2026-08421-A", false), {
      wrapper: createWrapper().QueryWrapper,
    });

    expect(previewRoomMoveMock).not.toHaveBeenCalled();
  });
});

describe("useApplyRoomMove", () => {
  beforeEach(() => {
    applyRoomMoveMock.mockReset();
  });

  it("posts the move and invalidates detail + preview queries on success", async () => {
    applyRoomMoveMock.mockResolvedValueOnce(applyDto());
    const { queryClient, QueryWrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () => useApplyRoomMove("GT-HB-01", ENDPOINT, "HB-2026-08421", "STAY-2026-08421-A"),
      { wrapper: QueryWrapper },
    );

    result.current.mutate({ targetRoomId: "ROOM-101", reason: "solicitud de habitación tranquila" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(expect.objectContaining({ status: "ROOM_MOVED" }));
    expect(applyRoomMoveMock).toHaveBeenCalledWith({
      endpoint: ENDPOINT,
      propertyId: "GT-HB-01",
      reservationId: "HB-2026-08421",
      stayId: "STAY-2026-08421-A",
      targetRoomId: "ROOM-101",
      reason: "solicitud de habitación tranquila",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["reservations", "GT-HB-01", ENDPOINT] });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["stays", "room-move-preview", "GT-HB-01", ENDPOINT, "HB-2026-08421", "STAY-2026-08421-A"],
    });
  });

  it("exposes a failed apply as mutation error and never sets ROOM_MOVED", async () => {
    applyRoomMoveMock.mockRejectedValueOnce(new HttpStatusError(409, "CONFLICT"));
    const { QueryWrapper } = createWrapper();

    const { result } = renderHook(
      () => useApplyRoomMove("GT-HB-01", ENDPOINT, "HB-2026-08421", "STAY-2026-08421-A"),
      { wrapper: QueryWrapper },
    );

    result.current.mutate({ targetRoomId: "ROOM-101", reason: null });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(HttpStatusError);
    expect(result.current.data).toBeUndefined();
  });
});