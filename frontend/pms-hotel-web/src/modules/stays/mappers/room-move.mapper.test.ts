import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { describe, expect, it } from "vitest";

import type { RoomMoveApplyDto, RoomMovePreviewDto } from "../dtos/room-move.dto";
import { mapRoomMoveApply, mapRoomMovePreview } from "./room-move.mapper";

function previewDto(overrides: Partial<RoomMovePreviewDto> = {}): RoomMovePreviewDto {
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
    finance_summary: {
      total_amount: "3920",
      paid_amount: "2400",
      balance_amount: "1520",
      currency: "GTQ",
      paid_count: 2,
      total_count: 5,
    },
    hk_impact: {
      from_room_state: "POR LIMPIAR",
      to_room_state: "OCUPADA",
      note: "Housekeeping recibe la transición; ReservationStay cambia room_id y conserva historial.",
    },
    folio_note: "Mismo folio y cargos · no se crea un segundo folio.",
    can_move: true,
    reason: null,
    ...overrides,
  };
}

describe("mapRoomMovePreview", () => {
  it("maps the room move projection with candidates, finance and HK impact", () => {
    expect(mapRoomMovePreview(previewDto())).toEqual({
      reservationId: "HB-2026-08421",
      stayId: "STAY-2026-08421-A",
      guestName: "María López",
      currentRoom: { roomId: "ROOM-203", roomLabel: "203", roomType: "Deluxe King" },
      candidates: [
        {
          roomId: "ROOM-101",
          roomLabel: "101",
          roomType: "Deluxe King",
          isCompatible: true,
          compatibilityNote: "mismo room type y capacidad",
          availabilityState: "AVAILABLE",
          availabilityNote: "limpia y verificada",
        },
      ],
      financeSummary: {
        totalAmount: 3920,
        paidAmount: 2400,
        balanceAmount: 1520,
        currency: "GTQ",
        paidCount: 2,
        totalCount: 5,
      },
      hkImpact: {
        fromRoomState: "POR LIMPIAR",
        toRoomState: "OCUPADA",
        note: "Housekeeping recibe la transición; ReservationStay cambia room_id y conserva historial.",
      },
      folioNote: "Mismo folio y cargos · no se crea un segundo folio.",
      canMove: true,
      reason: null,
    });
  });

  it("keeps the block reason when Backend rejects the move", () => {
    const preview = mapRoomMovePreview(
      previewDto({ can_move: false, reason: "La estadía está por salir; no se puede mover." }),
    );

    expect(preview.canMove).toBe(false);
    expect(preview.reason).toBe("La estadía está por salir; no se puede mover.");
  });

  it("maps an empty candidate list as still-open (no candidate selected)", () => {
    const preview = mapRoomMovePreview(previewDto({ candidates: [] }));

    expect(preview.candidates).toEqual([]);
  });

  it("rejects an invalid total amount", () => {
    expect(() =>
      mapRoomMovePreview(previewDto({ finance_summary: { ...previewDto().finance_summary, total_amount: "Q3,920" } })),
    ).toThrow(DomainMappingError);
  });

  it("rejects a missing destination availability state", () => {
    expect(() =>
      mapRoomMovePreview(previewDto({
        candidates: [{ ...previewDto().candidates[0], availability_state: " " }],
      })),
    ).toThrow(DomainMappingError);
  });

  it("rejects a missing HK impact note", () => {
    expect(() =>
      mapRoomMovePreview(previewDto({ hk_impact: { ...previewDto().hk_impact, note: "" } })),
    ).toThrow(DomainMappingError);
  });
});

describe("mapRoomMoveApply", () => {
  it("maps the confirmed ROOM_MOVED result", () => {
    const result = mapRoomMoveApply({
      reservation_id: "HB-2026-08421",
      stay_id: "STAY-2026-08421-A",
      status: "ROOM_MOVED",
      from_room_id: "ROOM-203",
      to_room_id: "ROOM-101",
      moved_at: "2026-08-29T11:30:00",
      hk_transition: "203 → POR LIMPIAR · 101 → OCUPADA",
      audit_summary: "ROOM_MOVED 203→101 · ReservationStay actualizado · Folio y cargos conservados",
      message: "HK: 203→POR LIMPIAR · 101→OCUPADA · Inventario: asignación 203→101 · ATS neto sin cambio · AuditTrail ROOM_MOVED",
    } satisfies RoomMoveApplyDto);

    expect(result).toEqual({
      reservationId: "HB-2026-08421",
      stayId: "STAY-2026-08421-A",
      status: "ROOM_MOVED",
      fromRoomId: "ROOM-203",
      toRoomId: "ROOM-101",
      movedAt: new Date("2026-08-29T11:30:00"),
      hkTransition: "203 → POR LIMPIAR · 101 → OCUPADA",
      auditSummary: "ROOM_MOVED 203→101 · ReservationStay actualizado · Folio y cargos conservados",
      message: "HK: 203→POR LIMPIAR · 101→OCUPADA · Inventario: asignación 203→101 · ATS neto sin cambio · AuditTrail ROOM_MOVED",
    });
  });

  it("rejects a response that is not ROOM_MOVED (no invented final state)", () => {
    expect(() => mapRoomMoveApply({
      reservation_id: "HB-2026-08421",
      stay_id: "STAY-2026-08421-A",
      status: "CONFIRMED",
      from_room_id: "ROOM-203",
      to_room_id: "ROOM-101",
      moved_at: "2026-08-29T11:30:00",
      hk_transition: "203 → POR LIMPIAR · 101 → OCUPADA",
      audit_summary: "ok",
      message: "ok",
    } as unknown as RoomMoveApplyDto)).toThrow(DomainMappingError);
  });
});