import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { mockServer } from "@/data/mocks/server";
import { HttpStatusError } from "@/lib/http/errors";

import { listReservationCenter } from "./reservation.service";

describe("listReservationCenter", () => {
  it("uses the supplied approved endpoint and preserves the property scope", async () => {
    mockServer.use(http.get("http://pms.test/contract/reservations", ({ request }) => {
      expect(new URL(request.url).searchParams.get("propertyId")).toBe("GT-HB-01");
      return HttpResponse.json({ summary: {}, alerts: [], reservations: [] });
    }));

    await expect(
      listReservationCenter({ endpoint: "http://pms.test/contract/reservations", propertyId: "GT-HB-01" }),
    ).resolves.toEqual({ summary: {}, alerts: [], reservations: [] });
  });

  it("returns technical HTTP errors to the hook", async () => {
    mockServer.use(http.get("http://pms.test/contract/reservations", () => HttpResponse.text(null, { status: 503 })));

    await expect(
      listReservationCenter({ endpoint: "http://pms.test/contract/reservations", propertyId: "GT-HB-01" }),
    ).rejects.toBeInstanceOf(HttpStatusError);
  });
});