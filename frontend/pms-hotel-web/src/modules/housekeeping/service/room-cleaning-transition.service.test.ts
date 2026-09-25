import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { mockServer } from "@/data/mocks/server";
import { HttpStatusError } from "@/lib/http/errors";

import {
  applyCleaningTransition,
  listDiscrepancyResolutions,
  resolveDiscrepancy,
} from "./room-cleaning-transition.service";

const ENDPOINT = "http://pms.test/contract/housekeeping";

describe("applyCleaningTransition", () => {
  it("POSTs the transition with room, target status and reason", async () => {
    mockServer.use(
      http.post("http://pms.test/contract/housekeeping/:roomId/transitions", async ({ request, params }) => {
        expect(params.roomId).toBe("ROOM-101");
        expect(new URL(request.url).searchParams.get("propertyId")).toBe("GT-HB-01");
        const body = (await request.json()) as { room_id: string; to_status: string; reason: string | null };
        expect(body).toEqual({ room_id: "ROOM-101", to_status: "CLEAN", reason: null });

        return HttpResponse.json({ room_id: "ROOM-101", property_id: "GT-HB-01", cleaning_status: "CLEAN" });
      }),
    );

    await expect(
      applyCleaningTransition({ endpoint: ENDPOINT, propertyId: "GT-HB-01", roomId: "ROOM-101", toStatus: "CLEAN", reason: null }),
    ).resolves.toMatchObject({ room_id: "ROOM-101", cleaning_status: "CLEAN" });
  });

  it("surfaces backend rejections to the hook", async () => {
    mockServer.use(
      http.post("http://pms.test/contract/housekeeping/:roomId/transitions", () =>
        HttpResponse.json({ error: "INVALID_TRANSITION" }, { status: 409 }),
      ),
    );

    await expect(
      applyCleaningTransition({ endpoint: ENDPOINT, propertyId: "GT-HB-01", roomId: "ROOM-101", toStatus: "INSPECTED", reason: null }),
    ).rejects.toBeInstanceOf(HttpStatusError);
  });
});

describe("discrepancy resolutions", () => {
  it("lists recorded resolutions", async () => {
    mockServer.use(
      http.get("http://pms.test/contract/housekeeping/discrepancy-resolutions", ({ request }) => {
        expect(new URL(request.url).searchParams.get("propertyId")).toBe("GT-HB-01");
        return HttpResponse.json({ resolutions: [] });
      }),
    );

    await expect(
      listDiscrepancyResolutions({ endpoint: ENDPOINT, propertyId: "GT-HB-01" }),
    ).resolves.toEqual({ resolutions: [] });
  });

  it("POSTs a resolution with room and reason without duplicating side effects", async () => {
    mockServer.use(
      http.post("http://pms.test/contract/housekeeping/discrepancy-resolutions", async ({ request }) => {
        const body = (await request.json()) as { room_id: string; reason: string };
        expect(body).toEqual({ room_id: "ROOM-101", reason: "Verificada con FO" });

        return HttpResponse.json({
          resolutions: [{ room_id: "ROOM-101", reason: "Verificada con FO", resolved_at: "2026-09-20T10:30:00.000Z" }],
        });
      }),
    );

    await expect(
      resolveDiscrepancy({ endpoint: ENDPOINT, propertyId: "GT-HB-01", roomId: "ROOM-101", reason: "Verificada con FO" }),
    ).resolves.toEqual({
      resolutions: [{ room_id: "ROOM-101", reason: "Verificada con FO", resolved_at: "2026-09-20T10:30:00.000Z" }],
    });
  });
});
