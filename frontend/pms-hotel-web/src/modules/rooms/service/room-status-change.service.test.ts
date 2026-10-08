import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { mockServer } from "@/data/mocks/server";
import { HttpStatusError } from "@/lib/http/errors";

import { changeRoomStatus } from "./room-status-change.service";

const ENDPOINT = "http://pms.test/contract/rooms";

describe("changeRoomStatus", () => {
  it("POSTs the block with reason and period", async () => {
    mockServer.use(
      http.post("http://pms.test/contract/rooms/:roomId/status-change", async ({ request, params }) => {
        expect(params.roomId).toBe("ROOM-103");
        expect(new URL(request.url).searchParams.get("propertyId")).toBe("GT-HB-01");
        const body = (await request.json()) as Record<string, string | null>;
        expect(body).toEqual({
          room_id: "ROOM-103",
          to_status: "OOO",
          reason: "Fuga de agua en baño",
          start_date: "2026-09-20",
          end_date: "2026-09-25",
        });

        return HttpResponse.json({
          room_id: "ROOM-103",
          property_id: "GT-HB-01",
          status: "OOO",
          blocked_from: "2026-09-20",
          blocked_to: "2026-09-25",
        });
      }),
    );

    await expect(
      changeRoomStatus({
        endpoint: ENDPOINT,
        propertyId: "GT-HB-01",
        roomId: "ROOM-103",
        toStatus: "OOO",
        reason: "Fuga de agua en baño",
        startDate: "2026-09-20",
        endDate: "2026-09-25",
      }),
    ).resolves.toMatchObject({ room_id: "ROOM-103", status: "OOO" });
  });

  it("surfaces backend rejections to the hook", async () => {
    mockServer.use(
      http.post("http://pms.test/contract/rooms/:roomId/status-change", () =>
        HttpResponse.json({ error: "REASON_REQUIRED" }, { status: 400 }),
      ),
    );

    await expect(
      changeRoomStatus({
        endpoint: ENDPOINT,
        propertyId: "GT-HB-01",
        roomId: "ROOM-103",
        toStatus: "OOS",
        reason: "",
        startDate: null,
        endDate: null,
      }),
    ).rejects.toBeInstanceOf(HttpStatusError);
  });
});
