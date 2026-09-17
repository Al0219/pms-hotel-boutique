import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { mockServer } from "@/data/mocks/server";
import { HttpStatusError } from "@/lib/http/errors";

import { applyStayExtension, previewStayExtension } from "./stay-extension.service";

const ENDPOINT = "http://pms.test/contract/reservations";

describe("previewStayExtension", () => {
  it("uses reservation and stay ids, the requested departure and preserves the property scope", async () => {
    mockServer.use(
      http.get("http://pms.test/contract/reservations/:reservationId/extension-preview", ({ request, params }) => {
        expect(params.reservationId).toBe("HB-2026-08421");
        expect(new URL(request.url).searchParams.get("propertyId")).toBe("GT-HB-01");
        expect(new URL(request.url).searchParams.get("stayId")).toBe("STAY-2026-08421-A");
        expect(new URL(request.url).searchParams.get("newDeparture")).toBe("2026-09-02");
        return HttpResponse.json({ reservation_id: "HB-2026-08421", can_extend: true });
      }),
    );

    await expect(
      previewStayExtension({
        endpoint: ENDPOINT,
        propertyId: "GT-HB-01",
        reservationId: "HB-2026-08421",
        stayId: "STAY-2026-08421-A",
        newDeparture: "2026-09-02",
      }),
    ).resolves.toMatchObject({ reservation_id: "HB-2026-08421", can_extend: true });
  });

  it("returns technical HTTP errors to the hook", async () => {
    mockServer.use(
      http.get("http://pms.test/contract/reservations/:reservationId/extension-preview", () =>
        HttpResponse.text(null, { status: 503 }),
      ),
    );

    await expect(
      previewStayExtension({
        endpoint: ENDPOINT,
        propertyId: "GT-HB-01",
        reservationId: "HB-2026-08421",
        stayId: "STAY-2026-08421-A",
        newDeparture: "2026-09-02",
      }),
    ).rejects.toBeInstanceOf(HttpStatusError);
  });
});

describe("applyStayExtension", () => {
  it("POSTs the extension with the new departure and reason", async () => {
    mockServer.use(
      http.post("http://pms.test/contract/reservations/:reservationId/extension", async ({ request, params }) => {
        expect(params.reservationId).toBe("HB-2026-08421");
        expect(new URL(request.url).searchParams.get("propertyId")).toBe("GT-HB-01");
        expect(await request.json()).toEqual({
          propertyId: "GT-HB-01",
          reservationId: "HB-2026-08421",
          stayId: "STAY-2026-08421-A",
          newDeparture: "2026-09-02",
          reason: "evento ampliado",
        });
        return HttpResponse.json({
          reservation_id: "HB-2026-08421",
          stay_id: "STAY-2026-08421-A",
          status: "EXTENDED",
          previous_departure: "2026-08-31",
          new_departure: "2026-09-02",
          extra_nights: 2,
          nights: 5,
          rate_per_night: "1160",
          delta_amount: "2320",
          extended_at: new Date().toISOString(),
          audit_summary: "EXTENDED 31 ago → 2 sep · ReservationStay actualizado",
          message: "Cargo adicional Q2,320 · ATS -2/noche · AuditTrail STAY_EXTENDED",
        });
      }),
    );

    await expect(
      applyStayExtension({
        endpoint: ENDPOINT,
        propertyId: "GT-HB-01",
        reservationId: "HB-2026-08421",
        stayId: "STAY-2026-08421-A",
        newDeparture: "2026-09-02",
        reason: "evento ampliado",
      }),
    ).resolves.toEqual(expect.objectContaining({ status: "EXTENDED" }));
  });

  it("sends a null reason when the user provides none", async () => {
    mockServer.use(
      http.post("http://pms.test/contract/reservations/:reservationId/extension", async ({ request }) => {
        expect(await request.json()).toEqual(
          expect.objectContaining({ stayId: "STAY-2026-08421-A", newDeparture: "2026-09-02", reason: null }),
        );
        return HttpResponse.json({
          reservation_id: "HB-2026-08421",
          stay_id: "STAY-2026-08421-A",
          status: "EXTENDED",
          previous_departure: "2026-08-31",
          new_departure: "2026-09-02",
          extra_nights: 2,
          nights: 5,
          rate_per_night: "1160",
          delta_amount: "2320",
          extended_at: new Date().toISOString(),
          audit_summary: "EXTENDED 31 ago → 2 sep · ReservationStay actualizado",
          message: "Cargo adicional Q2,320 · ATS -2/noche · AuditTrail STAY_EXTENDED",
        });
      }),
    );

    await expect(
      applyStayExtension({
        endpoint: ENDPOINT,
        propertyId: "GT-HB-01",
        reservationId: "HB-2026-08421",
        stayId: "STAY-2026-08421-A",
        newDeparture: "2026-09-02",
        reason: null,
      }),
    ).resolves.toEqual(expect.objectContaining({ status: "EXTENDED" }));
  });

  it("returns a failed apply as a non-OK error", async () => {
    mockServer.use(
      http.post("http://pms.test/contract/reservations/:reservationId/extension", () =>
        HttpResponse.text("la disponibilidad ya no está", { status: 409 }),
      ),
    );

    await expect(
      applyStayExtension({
        endpoint: ENDPOINT,
        propertyId: "GT-HB-01",
        reservationId: "HB-2026-08421",
        stayId: "STAY-2026-08421-A",
        newDeparture: "2026-09-02",
        reason: null,
      }),
    ).rejects.toBeInstanceOf(HttpStatusError);
  });
});