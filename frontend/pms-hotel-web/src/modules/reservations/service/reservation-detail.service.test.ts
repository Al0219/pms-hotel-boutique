import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { mockServer } from "@/data/mocks/server";
import { HttpStatusError } from "@/lib/http/errors";

import { getReservationDetail } from "./reservation.service";

describe("getReservationDetail", () => {
  it("uses the reservation id in the path and preserves the property scope", async () => {
    mockServer.use(http.get("http://pms.test/contract/reservations/:reservationId", ({ request, params }) => {
      expect(params.reservationId).toBe("HB-2026-08421");
      expect(new URL(request.url).searchParams.get("propertyId")).toBe("GT-HB-01");
      return HttpResponse.json({ reservation_id: "HB-2026-08421" });
    }));

    await expect(
      getReservationDetail({
        endpoint: "http://pms.test/contract/reservations",
        propertyId: "GT-HB-01",
        reservationId: "HB-2026-08421",
      }),
    ).resolves.toEqual({ reservation_id: "HB-2026-08421" });
  });

  it("returns technical HTTP errors to the hook", async () => {
    mockServer.use(http.get("http://pms.test/contract/reservations/:reservationId", () => HttpResponse.text(null, { status: 503 })));

    await expect(
      getReservationDetail({
        endpoint: "http://pms.test/contract/reservations",
        propertyId: "GT-HB-01",
        reservationId: "HB-2026-08421",
      }),
    ).rejects.toBeInstanceOf(HttpStatusError);
  });
});