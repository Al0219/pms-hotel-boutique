import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { mockServer } from "@/data/mocks/server";
import { HttpStatusError } from "@/lib/http/errors";

import { listPropertyReports } from "./property-report.service";

describe("listPropertyReports", () => {
  it("uses the supplied approved endpoint and preserves the property scope", async () => {
    mockServer.use(http.get("http://pms.test/contract/reports", ({ request }) => {
      expect(new URL(request.url).searchParams.get("propertyId")).toBe("GT-HB-01");
      return HttpResponse.json({ reports: [] });
    }));

    await expect(
      listPropertyReports({ endpoint: "http://pms.test/contract/reports", propertyId: "GT-HB-01" }),
    ).resolves.toEqual({ reports: [] });
  });

  it("returns technical HTTP errors to the hook", async () => {
    mockServer.use(http.get("http://pms.test/contract/reports", () => HttpResponse.text(null, { status: 503 })));

    await expect(
      listPropertyReports({ endpoint: "http://pms.test/contract/reports", propertyId: "GT-HB-01" }),
    ).rejects.toBeInstanceOf(HttpStatusError);
  });
});
