import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { mockServer } from "@/data/mocks/server";
import { HttpStatusError } from "@/lib/http/errors";

import { listMaintenanceOrders } from "./maintenance-order.service";

describe("listMaintenanceOrders", () => {
  it("uses the supplied approved endpoint and preserves the property scope", async () => {
    mockServer.use(http.get("http://pms.test/contract/maintenance-orders", ({ request }) => {
      expect(new URL(request.url).searchParams.get("propertyId")).toBe("GT-HB-01");
      return HttpResponse.json({ orders: [] });
    }));

    await expect(listMaintenanceOrders({ endpoint: "http://pms.test/contract/maintenance-orders", propertyId: "GT-HB-01" })).resolves.toEqual({ orders: [] });
  });

  it("returns technical HTTP errors to the hook", async () => {
    mockServer.use(http.get("http://pms.test/contract/maintenance-orders", () => HttpResponse.text(null, { status: 503 })));

    await expect(listMaintenanceOrders({ endpoint: "http://pms.test/contract/maintenance-orders", propertyId: "GT-HB-01" })).rejects.toBeInstanceOf(HttpStatusError);
  });
});
