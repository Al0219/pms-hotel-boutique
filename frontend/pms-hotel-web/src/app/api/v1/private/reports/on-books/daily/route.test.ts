import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchBackend = vi.fn<typeof fetch>();
let GET: typeof import("./route").GET;
const propertyId = "22222222-2222-4222-8222-222222222222";
const otherPropertyId = "33333333-3333-4333-8333-333333333333";
const row = { propertyId, timezone: "America/Guatemala", currency: "GTQ", stayDate: "2035-01-01",
  physicalRooms: 3, outOfOrderRooms: 1, availableRooms: 2, onBooksRooms: 2,
  onBooksPercent: 100, unavailableReason: null };

function request(query = `from=2035-01-01&to=2035-01-03&propertyId=${propertyId}`, cookie = "pms_staff_access=staff-token; pms_guest_access=guest-token") {
  return new NextRequest(`http://localhost/api/v1/private/reports/on-books/daily?${query}`, {
    headers: { cookie, authorization: "Bearer client-token" },
  });
}

beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv("PMS_BACKEND_INTERNAL_URL", "http://backend:8080");
  vi.stubGlobal("fetch", fetchBackend);
  fetchBackend.mockReset();
  GET = (await import("./route")).GET;
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("daily on-books Staff BFF", () => {
  it("forwards a single-property query with only the Staff cookie and projects the response", async () => {
    fetchBackend.mockResolvedValue(Response.json({ calculatedAt: "2035-01-01T12:00:00Z", rows: [{ ...row, privateField: "secret" }], token: "secret" }));
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ calculatedAt: "2035-01-01T12:00:00Z", rows: [row] });
    const [url, init] = fetchBackend.mock.calls[0];
    expect(url).toBe(`http://backend:8080/api/v1/reports/on-books/daily?from=2035-01-01&to=2035-01-03&propertyId=${propertyId}`);
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer staff-token");
    expect(init?.cache).toBe("no-store");
  });

  it("forwards explicit ALL_PROPERTIES and preserves a zero-capacity row", async () => {
    const emptyCapacity = { ...row, propertyId: otherPropertyId, physicalRooms: 0, outOfOrderRooms: 0,
      availableRooms: 0, onBooksRooms: 0, onBooksPercent: null, unavailableReason: "NO_AVAILABLE_ROOMS" };
    fetchBackend.mockResolvedValue(Response.json({ calculatedAt: "2035-01-01T12:00:00Z", rows: [row, emptyCapacity] }));
    const response = await GET(request("from=2035-01-01&to=2035-01-03&scope=ALL_PROPERTIES"));
    expect(response.status).toBe(200);
    expect((await response.json()).rows).toEqual([row, emptyCapacity]);
    expect(fetchBackend.mock.calls[0][0]).toContain("scope=ALL_PROPERTIES");
  });

  it("requires a Staff cookie even when a Guest cookie or client bearer is present", async () => {
    expect((await GET(request(undefined, "pms_guest_access=guest-token"))).status).toBe(401);
    expect(fetchBackend).not.toHaveBeenCalled();
  });

  it.each([
    "", "from=2035-01-01&to=2035-01-03", `from=2035-01-01&to=2035-01-03&propertyId=${propertyId}&scope=ALL_PROPERTIES`,
    `from=2035-01-01&to=2035-01-03&propertyId=${propertyId}&propertyId=${propertyId}`,
    `from=2035-01-01&to=2035-01-03&propertyId=${propertyId}&organizationId=ignored`,
    `from=2035-01-03&to=2035-01-01&propertyId=${propertyId}`,
    `from=2035-01-01&to=2036-01-02&propertyId=${propertyId}`,
    "from=2035-01-01&to=2035-01-03&propertyId=invalid",
  ])("rejects invalid filters without calling Backend: %s", async query => {
    expect((await GET(request(query))).status).toBe(400);
    expect(fetchBackend).not.toHaveBeenCalled();
  });

  it.each([400, 401, 403, 500])("preserves contracted status %i without exposing upstream details", async status => {
    fetchBackend.mockResolvedValue(Response.json({ secret: "private" }, { status }));
    const response = await GET(request());
    expect(response.status).toBe(status === 500 ? 503 : status);
    expect(JSON.stringify(await response.json())).not.toContain("private");
  });

  it("rejects malformed or cross-property responses", async () => {
    fetchBackend.mockResolvedValueOnce(Response.json({ calculatedAt: "2035-01-01T12:00:00Z", rows: [{ ...row, propertyId: otherPropertyId }] }));
    expect((await GET(request())).status).toBe(503);
    fetchBackend.mockResolvedValueOnce(Response.json({ calculatedAt: "2035-01-01T12:00:00Z", rows: [{ ...row, onBooksPercent: null }] }));
    expect((await GET(request())).status).toBe(503);
    fetchBackend.mockResolvedValueOnce(Response.json({ calculatedAt: "2035-01-01T12:00:00Z", rows: [{ ...row, stayDate: "2035-01-04" }] }));
    expect((await GET(request())).status).toBe(503);
  });
});
