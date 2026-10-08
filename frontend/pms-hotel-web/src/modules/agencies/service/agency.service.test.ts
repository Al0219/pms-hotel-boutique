import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { mockServer } from "@/data/mocks/server";
import { HttpStatusError } from "@/lib/http/errors";

import { listAgencies } from "./agency.service";

describe("listAgencies", () => {
  it("uses the supplied approved endpoint and preserves the property scope", async () => {
    mockServer.use(http.get("http://pms.test/contract/agencies", ({ request }) => {
      expect(new URL(request.url).searchParams.get("propertyId")).toBe("GT-HB-01");
      return HttpResponse.json({ agencies: [] });
    }));

    await expect(listAgencies({ endpoint: "http://pms.test/contract/agencies", propertyId: "GT-HB-01" })).resolves.toEqual({ agencies: [] });
  });

  it("returns technical HTTP errors to the hook", async () => {
    mockServer.use(http.get("http://pms.test/contract/agencies", () => HttpResponse.text(null, { status: 503 })));

    await expect(listAgencies({ endpoint: "http://pms.test/contract/agencies", propertyId: "GT-HB-01" })).rejects.toBeInstanceOf(HttpStatusError);
  });
});
