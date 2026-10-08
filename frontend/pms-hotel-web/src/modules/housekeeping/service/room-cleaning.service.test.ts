import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { mockServer } from "@/data/mocks/server";
import { HttpStatusError } from "@/lib/http/errors";

import { listRoomCleaning } from "./room-cleaning.service";

describe("listRoomCleaning", () => {
  it("uses the supplied approved endpoint and preserves the property scope", async () => {
    mockServer.use(http.get("http://pms.test/contract/housekeeping", ({ request }) => {
      expect(new URL(request.url).searchParams.get("propertyId")).toBe("GT-HB-01");
      return HttpResponse.json({ rooms: [] });
    }));

    await expect(
      listRoomCleaning({ endpoint: "http://pms.test/contract/housekeeping", propertyId: "GT-HB-01" }),
    ).resolves.toEqual({ rooms: [] });
  });

  it("returns technical HTTP errors to the hook", async () => {
    mockServer.use(http.get("http://pms.test/contract/housekeeping", () => HttpResponse.text(null, { status: 503 })));

    await expect(
      listRoomCleaning({ endpoint: "http://pms.test/contract/housekeeping", propertyId: "GT-HB-01" }),
    ).rejects.toBeInstanceOf(HttpStatusError);
  });
});
