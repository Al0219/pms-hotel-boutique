import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { mockServer } from "@/data/mocks/server";
import { HttpStatusError } from "@/lib/http/errors";

import { applyRoomMove, previewRoomMove } from "./room-move.service";

const ENDPOINT = "http://pms.test/contract/reservations";

describe("previewRoomMove", () => {
  it("uses reservation and stay ids and preserves the property scope", async () => {
    mockServer.use(
      http.get("http://pms.test/contract/reservations/:reservationId/room-move-preview", ({ request, params }) => {
        expect(params.reservationId).toBe("HB-2026-08421");
        expect(new URL(request.url).searchParams.get("propertyId")).toBe("GT-HB-01");
        expect(new URL(request.url).searchParams.get("stayId")).toBe("STAY-2026-08421-A");
        return HttpResponse.json({ reservation_id: "HB-2026-08421", can_move: true, candidates: [] });
      }),
    );

    await expect(
      previewRoomMove({
        endpoint: ENDPOINT,
        propertyId: "GT-HB-01",
        reservationId: "HB-2026-08421",
        stayId: "STAY-2026-08421-A",
      }),
    ).resolves.toMatchObject({ reservation_id: "HB-2026-08421", can_move: true });
  });

  it("returns technical HTTP errors to the hook", async () => {
    mockServer.use(
      http.get("http://pms.test/contract/reservations/:reservationId/room-move-preview", () =>
        HttpResponse.text(null, { status: 503 }),
      ),
    );

    await expect(
      previewRoomMove({
        endpoint: ENDPOINT,
        propertyId: "GT-HB-01",
        reservationId: "HB-2026-08421",
        stayId: "STAY-2026-08421-A",
      }),
    ).rejects.toBeInstanceOf(HttpStatusError);
  });
});

describe("applyRoomMove", () => {
  it("POSTs the move with stay, target room and reason", async () => {
    mockServer.use(
      http.post("http://pms.test/contract/reservations/:reservationId/room-move", async ({ request, params }) => {
        expect(params.reservationId).toBe("HB-2026-08421");
        expect(new URL(request.url).searchParams.get("propertyId")).toBe("GT-HB-01");
        expect(await request.json()).toEqual({
          propertyId: "GT-HB-01",
          reservationId: "HB-2026-08421",
          stayId: "STAY-2026-08421-A",
          targetRoomId: "ROOM-101",
          reason: "solicitud de habitación tranquila",
        });
        return HttpResponse.json({
          reservation_id: "HB-2026-08421",
          stay_id: "STAY-2026-08421-A",
          status: "ROOM_MOVED",
          from_room_id: "ROOM-203",
          to_room_id: "ROOM-101",
          moved_at: new Date().toISOString(),
          hk_transition: "203 → POR LIMPIAR · 101 → OCUPADA",
          audit_summary: "ROOM_MOVED 203→101 · ReservationStay actualizado · Folio y cargos conservados",
          message: "HK: 203→POR LIMPIAR · 101→OCUPADA · AuditTrail ROOM_MOVED",
        });
      }),
    );

    await expect(
      applyRoomMove({
        endpoint: ENDPOINT,
        propertyId: "GT-HB-01",
        reservationId: "HB-2026-08421",
        stayId: "STAY-2026-08421-A",
        targetRoomId: "ROOM-101",
        reason: "solicitud de habitación tranquila",
      }),
    ).resolves.toEqual(expect.objectContaining({ status: "ROOM_MOVED" }));
  });

  it("sends a null reason when the user provides none", async () => {
    mockServer.use(
      http.post("http://pms.test/contract/reservations/:reservationId/room-move", async ({ request }) => {
        expect(await request.json()).toEqual(
          expect.objectContaining({ stayId: "STAY-2026-08421-A", targetRoomId: "ROOM-101", reason: null }),
        );
        return HttpResponse.json({
          reservation_id: "HB-2026-08421",
          stay_id: "STAY-2026-08421-A",
          status: "ROOM_MOVED",
          from_room_id: "ROOM-203",
          to_room_id: "ROOM-101",
          moved_at: new Date().toISOString(),
          hk_transition: "203 → POR LIMPIAR · 101 → OCUPADA",
          audit_summary: "ROOM_MOVED 203→101 · Folio y cargos conservados",
          message: "HK: 203→POR LIMPIAR · 101→OCUPADA · AuditTrail ROOM_MOVED",
        });
      }),
    );

    await expect(
      applyRoomMove({
        endpoint: ENDPOINT,
        propertyId: "GT-HB-01",
        reservationId: "HB-2026-08421",
        stayId: "STAY-2026-08421-A",
        targetRoomId: "ROOM-101",
        reason: null,
      }),
    ).resolves.toEqual(expect.objectContaining({ status: "ROOM_MOVED" }));
  });

  it("returns a failed apply as a non-OK error", async () => {
    mockServer.use(
      http.post("http://pms.test/contract/reservations/:reservationId/room-move", () =>
        HttpResponse.text("disponibilidad ya no está", { status: 409 }),
      ),
    );

    await expect(
      applyRoomMove({
        endpoint: ENDPOINT,
        propertyId: "GT-HB-01",
        reservationId: "HB-2026-08421",
        stayId: "STAY-2026-08421-A",
        targetRoomId: "ROOM-101",
        reason: null,
      }),
    ).rejects.toBeInstanceOf(HttpStatusError);
  });
});