import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { mockServer } from "@/data/mocks/server";
import { HttpStatusError } from "@/lib/http/errors";

import { listOperationalMessages } from "./operational-message.service";

describe("listOperationalMessages", () => {
  it("uses the supplied approved endpoint and preserves the property scope", async () => {
    mockServer.use(http.get("http://pms.test/contract/operational-messages", ({ request }) => {
      expect(new URL(request.url).searchParams.get("propertyId")).toBe("GT-HB-01");
      return HttpResponse.json({ messages: [] });
    }));

    await expect(
      listOperationalMessages({ endpoint: "http://pms.test/contract/operational-messages", propertyId: "GT-HB-01" }),
    ).resolves.toEqual({ messages: [] });
  });

  it("returns technical HTTP errors to the hook", async () => {
    mockServer.use(http.get("http://pms.test/contract/operational-messages", () => HttpResponse.text(null, { status: 503 })));

    await expect(
      listOperationalMessages({ endpoint: "http://pms.test/contract/operational-messages", propertyId: "GT-HB-01" }),
    ).rejects.toBeInstanceOf(HttpStatusError);
  });
});
