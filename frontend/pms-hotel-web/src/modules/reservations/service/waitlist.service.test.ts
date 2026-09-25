import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { mockServer } from "@/data/mocks/server";
import { HttpStatusError } from "@/lib/http/errors";

import { confirmWaitlistConversion, previewWaitlistConversion } from "./waitlist.service";

const ENDPOINT = "http://pms.test/contract/reservations";

describe("previewWaitlistConversion", () => {
  it("uses the waitlist id in the path and preserves the property scope", async () => {
    mockServer.use(http.get("http://pms.test/contract/reservations/waitlist/:waitlistId/conversion-preview", ({ request, params }) => {
      expect(params.waitlistId).toBe("WAIT-0007");
      expect(new URL(request.url).searchParams.get("propertyId")).toBe("GT-HB-01");
      return HttpResponse.json({ waitlist_id: "WAIT-0007" });
    }));

    await expect(
      previewWaitlistConversion({ endpoint: ENDPOINT, propertyId: "GT-HB-01", waitlistId: "WAIT-0007" }),
    ).resolves.toEqual({ waitlist_id: "WAIT-0007" });
  });

  it("returns technical HTTP errors to the hook", async () => {
    mockServer.use(
      http.get("http://pms.test/contract/reservations/waitlist/:waitlistId/conversion-preview", () =>
        HttpResponse.text(null, { status: 503 }),
      ),
    );

    await expect(
      previewWaitlistConversion({ endpoint: ENDPOINT, propertyId: "GT-HB-01", waitlistId: "WAIT-0007" }),
    ).rejects.toBeInstanceOf(HttpStatusError);
  });
});

describe("confirmWaitlistConversion", () => {
  it("POSTs the conversion and returns the CONVERTED result", async () => {
    mockServer.use(
      http.post("http://pms.test/contract/reservations/waitlist/:waitlistId/conversion", async ({ request, params }) => {
        expect(params.waitlistId).toBe("WAIT-0007");
        expect(new URL(request.url).searchParams.get("propertyId")).toBe("GT-HB-01");
        expect(await request.json()).toEqual({ propertyId: "GT-HB-01", waitlistId: "WAIT-0007" });
        return HttpResponse.json({
          waitlist_id: "WAIT-0007",
          reservation_id: "HB-2026-09128",
          status: "CONVERTED",
          message: "disponibilidad/tarifa revalidadas",
        });
      }),
    );

    await expect(
      confirmWaitlistConversion({ endpoint: ENDPOINT, propertyId: "GT-HB-01", waitlistId: "WAIT-0007" }),
    ).resolves.toEqual({
      waitlist_id: "WAIT-0007",
      reservation_id: "HB-2026-09128",
      status: "CONVERTED",
      message: "disponibilidad/tarifa revalidadas",
    });
  });

  it("surfaces a failed revalidation (409) as a non-OK error instead of inventing success", async () => {
    mockServer.use(
      http.post("http://pms.test/contract/reservations/waitlist/:waitlistId/conversion", () =>
        HttpResponse.text("disponibilidad o tarifa cambiaron", { status: 409 }),
      ),
    );

    await expect(
      confirmWaitlistConversion({ endpoint: ENDPOINT, propertyId: "GT-HB-01", waitlistId: "WAIT-0007" }),
    ).rejects.toBeInstanceOf(HttpStatusError);
  });

  it("returns technical HTTP errors to the hook", async () => {
    mockServer.use(
      http.post("http://pms.test/contract/reservations/waitlist/:waitlistId/conversion", () =>
        HttpResponse.text(null, { status: 503 }),
      ),
    );

    await expect(
      confirmWaitlistConversion({ endpoint: ENDPOINT, propertyId: "GT-HB-01", waitlistId: "WAIT-0007" }),
    ).rejects.toBeInstanceOf(HttpStatusError);
  });
});