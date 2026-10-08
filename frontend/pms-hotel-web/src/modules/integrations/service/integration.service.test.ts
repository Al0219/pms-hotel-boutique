import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { mockServer } from "@/data/mocks/server";
import { HttpStatusError } from "@/lib/http/errors";

import { listIntegrations } from "./integration.service";

describe("listIntegrations", () => {
  it("uses the supplied approved endpoint and preserves the property scope", async () => {
    mockServer.use(http.get("http://pms.test/contract/integrations", ({ request }) => {
      expect(new URL(request.url).searchParams.get("propertyId")).toBe("GT-HB-01");
      return HttpResponse.json({ integrations: [] });
    }));

    await expect(
      listIntegrations({ endpoint: "http://pms.test/contract/integrations", propertyId: "GT-HB-01" }),
    ).resolves.toEqual({ integrations: [] });
  });

  it("returns technical HTTP errors to the hook", async () => {
    mockServer.use(http.get("http://pms.test/contract/integrations", () => HttpResponse.text(null, { status: 503 })));

    await expect(
      listIntegrations({ endpoint: "http://pms.test/contract/integrations", propertyId: "GT-HB-01" }),
    ).rejects.toBeInstanceOf(HttpStatusError);
  });
});
