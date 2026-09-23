import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { mockServer } from "@/data/mocks/server";
import { HttpStatusError } from "@/lib/http/errors";

import { listValetRequests } from "./valet-request.service";

describe("listValetRequests", () => {
  it("uses the supplied approved endpoint and preserves the property scope", async () => {
    mockServer.use(http.get("http://pms.test/contract/valet-requests", ({ request }) => {
      expect(new URL(request.url).searchParams.get("propertyId")).toBe("GT-HB-01");
      return HttpResponse.json({ requests: [] });
    }));

    await expect(
      listValetRequests({ endpoint: "http://pms.test/contract/valet-requests", propertyId: "GT-HB-01" }),
    ).resolves.toEqual({ requests: [] });
  });

  it("returns technical HTTP errors to the hook", async () => {
    mockServer.use(http.get("http://pms.test/contract/valet-requests", () => HttpResponse.text(null, { status: 503 })));

    await expect(
      listValetRequests({ endpoint: "http://pms.test/contract/valet-requests", propertyId: "GT-HB-01" }),
    ).rejects.toBeInstanceOf(HttpStatusError);
  });
});
