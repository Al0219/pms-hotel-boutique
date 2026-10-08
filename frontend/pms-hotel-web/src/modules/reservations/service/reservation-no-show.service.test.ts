import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { mockServer } from "@/data/mocks/server";
import { HttpStatusError } from "@/lib/http/errors";

import { applyNoShow, previewNoShow } from "./reservation.service";

const ENDPOINT = "http://pms.test/contract/reservations";

describe("previewNoShow", () => {
  it("uses the reservation id and preserves the property scope", async () => {
    mockServer.use(http.get("http://pms.test/contract/reservations/:reservationId/no-show-preview", ({ request, params }) => {
      expect(params.reservationId).toBe("HB-2026-08112");
      expect(new URL(request.url).searchParams.get("propertyId")).toBe("GT-HB-01");
      return HttpResponse.json({ reservation_id: "HB-2026-08112", can_mark_no_show: true });
    }));

    await expect(
      previewNoShow({ endpoint: ENDPOINT, propertyId: "GT-HB-01", reservationId: "HB-2026-08112" }),
    ).resolves.toMatchObject({ reservation_id: "HB-2026-08112", can_mark_no_show: true });
  });

  it("returns technical HTTP errors to the hook", async () => {
    mockServer.use(
      http.get("http://pms.test/contract/reservations/:reservationId/no-show-preview", () =>
        HttpResponse.text(null, { status: 503 }),
      ),
    );

    await expect(
      previewNoShow({ endpoint: ENDPOINT, propertyId: "GT-HB-01", reservationId: "HB-2026-08112" }),
    ).rejects.toBeInstanceOf(HttpStatusError);
  });
});

describe("applyNoShow", () => {
  it("POSTs the no-show action", async () => {
    mockServer.use(
      http.post("http://pms.test/contract/reservations/:reservationId/no-show", async ({ request, params }) => {
        expect(params.reservationId).toBe("HB-2026-08112");
        expect(new URL(request.url).searchParams.get("propertyId")).toBe("GT-HB-01");
        expect(await request.json()).toEqual({
          propertyId: "GT-HB-01",
          reservationId: "HB-2026-08112",
        });
        return HttpResponse.json({
          reservation_id: "HB-2026-08112",
          status: "NO_SHOW",
          marked_at: new Date().toISOString(),
          allowed_charge: "470",
          message: "No-show: cargo Q470 · ATS +1/noche",
        });
      }),
    );

    await expect(
      applyNoShow({
        endpoint: ENDPOINT,
        propertyId: "GT-HB-01",
        reservationId: "HB-2026-08112",
      }),
    ).resolves.toEqual(expect.objectContaining({ status: "NO_SHOW" }));
  });

  it("returns a failed apply as a non-OK error", async () => {
    mockServer.use(
      http.post("http://pms.test/contract/reservations/:reservationId/no-show", () =>
        HttpResponse.text("reserva ya cancelada", { status: 409 }),
      ),
    );

    await expect(
      applyNoShow({ endpoint: ENDPOINT, propertyId: "GT-HB-01", reservationId: "HB-2026-08112" }),
    ).rejects.toBeInstanceOf(HttpStatusError);
  });

  it("returns technical HTTP errors to the hook", async () => {
    mockServer.use(
      http.post("http://pms.test/contract/reservations/:reservationId/no-show", () =>
        HttpResponse.text(null, { status: 503 }),
      ),
    );

    await expect(
      applyNoShow({ endpoint: ENDPOINT, propertyId: "GT-HB-01", reservationId: "HB-2026-08112" }),
    ).rejects.toBeInstanceOf(HttpStatusError);
  });
});
