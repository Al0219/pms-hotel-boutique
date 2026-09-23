import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { mockServer } from "@/data/mocks/server";
import { HttpStatusError } from "@/lib/http/errors";

import { listCompanies } from "./company.service";

describe("listCompanies", () => {
  it("uses the supplied approved endpoint and preserves the property scope", async () => {
    mockServer.use(http.get("http://pms.test/contract/companies", ({ request }) => {
      expect(new URL(request.url).searchParams.get("propertyId")).toBe("GT-HB-01");
      return HttpResponse.json({ companies: [] });
    }));

    await expect(listCompanies({ endpoint: "http://pms.test/contract/companies", propertyId: "GT-HB-01" })).resolves.toEqual({ companies: [] });
  });

  it("returns technical HTTP errors to the hook", async () => {
    mockServer.use(http.get("http://pms.test/contract/companies", () => HttpResponse.text(null, { status: 503 })));

    await expect(listCompanies({ endpoint: "http://pms.test/contract/companies", propertyId: "GT-HB-01" })).rejects.toBeInstanceOf(HttpStatusError);
  });
});
