import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { mockServer } from "@/data/mocks/server";
import { HttpStatusError } from "@/lib/http/errors";

import { listGroups } from "./group.service";

describe("listGroups", () => {
  it("uses the supplied approved endpoint and preserves the property scope", async () => {
    mockServer.use(http.get("http://pms.test/contract/groups", ({ request }) => {
      expect(new URL(request.url).searchParams.get("propertyId")).toBe("GT-HB-01");
      return HttpResponse.json({ groups: [] });
    }));

    await expect(listGroups({ endpoint: "http://pms.test/contract/groups", propertyId: "GT-HB-01" })).resolves.toEqual({ groups: [] });
  });

  it("returns technical HTTP errors to the hook", async () => {
    mockServer.use(http.get("http://pms.test/contract/groups", () => HttpResponse.text(null, { status: 503 })));

    await expect(listGroups({ endpoint: "http://pms.test/contract/groups", propertyId: "GT-HB-01" })).rejects.toBeInstanceOf(HttpStatusError);
  });
});
