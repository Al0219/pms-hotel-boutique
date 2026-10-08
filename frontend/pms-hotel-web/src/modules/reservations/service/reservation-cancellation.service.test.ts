import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { mockServer } from "@/data/mocks/server";
import { HttpStatusError } from "@/lib/http/errors";

import { applyCancellation, previewCancellation } from "./reservation.service";

const ENDPOINT = "http://pms.test/contract/reservations";

describe("previewCancellation", () => {
  it("uses the reservation id and preserves the property scope", async () => {
    mockServer.use(http.get("http://pms.test/contract/reservations/:reservationId/cancellation-preview", ({ request, params }) => {
      expect(params.reservationId).toBe("HB-2026-08421");
      expect(new URL(request.url).searchParams.get("propertyId")).toBe("GT-HB-01");
      return HttpResponse.json({ reservation_id: "HB-2026-08421", can_cancel: true });
    }));

    await expect(
      previewCancellation({ endpoint: ENDPOINT, propertyId: "GT-HB-01", reservationId: "HB-2026-08421" }),
    ).resolves.toMatchObject({ reservation_id: "HB-2026-08421", can_cancel: true });
  });

  it("returns technical HTTP errors to the hook", async () => {
    mockServer.use(
      http.get("http://pms.test/contract/reservations/:reservationId/cancellation-preview", () =>
        HttpResponse.text(null, { status: 503 }),
      ),
    );

    await expect(
      previewCancellation({ endpoint: ENDPOINT, propertyId: "GT-HB-01", reservationId: "HB-2026-08421" }),
    ).rejects.toBeInstanceOf(HttpStatusError);
  });
});

describe("applyCancellation", () => {
  it("POSTs the cancellation with the required reason", async () => {
    mockServer.use(
      http.post("http://pms.test/contract/reservations/:reservationId/cancellation", async ({ request, params }) => {
        expect(params.reservationId).toBe("HB-2026-08421");
        expect(new URL(request.url).searchParams.get("propertyId")).toBe("GT-HB-01");
        expect(await request.json()).toEqual({
          propertyId: "GT-HB-01",
          reservationId: "HB-2026-08421",
          reason: "Cambio de planes del huésped",
        });
        return HttpResponse.json({
          reservation_id: "HB-2026-08421",
          status: "CANCELLED",
          cancelled_at: "2026-08-28T09:30:00",
          penalty_amount: "1160",
          refund_amount: "0",
          message: "Penalty Charge Q1,160 · Refund Q 0",
        });
      }),
    );

    await expect(
      applyCancellation({
        endpoint: ENDPOINT,
        propertyId: "GT-HB-01",
        reservationId: "HB-2026-08421",
        reason: "Cambio de planes del huésped",
      }),
    ).resolves.toEqual(expect.objectContaining({ status: "CANCELLED" }));
  });

  it("returns a failed apply as a non-OK error", async () => {
    mockServer.use(
      http.post("http://pms.test/contract/reservations/:reservationId/cancellation", () =>
        HttpResponse.text("fuera de ventana", { status: 409 }),
      ),
    );

    await expect(
      applyCancellation({ endpoint: ENDPOINT, propertyId: "GT-HB-01", reservationId: "HB-2026-08421", reason: "Cambio de planes" }),
    ).rejects.toBeInstanceOf(HttpStatusError);
  });

  it("returns technical HTTP errors to the hook", async () => {
    mockServer.use(
      http.post("http://pms.test/contract/reservations/:reservationId/cancellation", () =>
        HttpResponse.text(null, { status: 503 }),
      ),
    );

    await expect(
      applyCancellation({ endpoint: ENDPOINT, propertyId: "GT-HB-01", reservationId: "HB-2026-08421", reason: "Cambio de planes" }),
    ).rejects.toBeInstanceOf(HttpStatusError);
  });
});