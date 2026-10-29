import { NextRequest } from "next/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const fetchBackend = vi.fn<typeof fetch>();
let GET: typeof import("./route").GET;
const id = "22222222-2222-4222-8222-222222222222", other = "33333333-3333-4333-8333-333333333333";
const row = { propertyId: id, timezone: "America/Guatemala", currency: "GTQ", date: "2035-01-01", pendingArrivals: 2, pendingDepartures: 1 };
const dto = (rows = [row]) => ({ calculatedAt: "2035-01-01T12:00:00Z", rows });
const query = `from=2035-01-01&to=2035-01-03&propertyId=${id}`;
function request(filters = query, cookie = "pms_staff_access=staff-token; pms_guest_access=guest-token") {
  return new NextRequest(`http://localhost/api/v1/private/reports/arrivals-departures/daily?${filters}`, {
    headers: { cookie, authorization: "Bearer browser-token" },
  });
}

beforeEach(async () => {
  vi.resetModules(); vi.stubEnv("PMS_BACKEND_INTERNAL_URL", "http://backend:8080");
  vi.stubGlobal("fetch", fetchBackend); fetchBackend.mockReset(); GET = (await import("./route")).GET;
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("uses only Staff HttpOnly access, forwards cancellation and projects an allowlist without private caching", async () => {
  fetchBackend.mockResolvedValue(Response.json({ ...dto(), token: "private", rows: [{ ...row, guestName: "private" }] }));
  const response = await GET(request());
  expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toEqual(dto());
  const [url, init] = fetchBackend.mock.calls[0];
  expect(url).toBe(`http://backend:8080/api/v1/reports/arrivals-departures/daily?${query}`);
  expect(new Headers(init?.headers).get("authorization")).toBe("Bearer staff-token");
  expect(init?.cache).toBe("no-store"); expect(init?.signal).toBeInstanceOf(AbortSignal);
});

it("forwards explicit ALL_PROPERTIES and preserves empty results", async () => {
  fetchBackend.mockResolvedValue(Response.json(dto([])));
  expect(await (await GET(request("from=2035-01-01&to=2035-01-03&scope=ALL_PROPERTIES"))).json()).toEqual(dto([]));
  expect(fetchBackend.mock.calls[0][0]).toContain("scope=ALL_PROPERTIES");
});

it("rejects Guest-only access and ignores browser Bearer", async () => {
  const response = await GET(request(query, "pms_guest_access=guest-token"));
  expect(response.status).toBe(401); expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(fetchBackend).not.toHaveBeenCalled();
});

it.each(["", `from=2035-01-01&to=2035-01-03`, `${query}&propertyId=${id}`, `${query}&scope=ALL_PROPERTIES`,
  `${query}&from=2035-01-01`, `${query}&secret=x`, `from=2035-02-30&to=2035-03-01&propertyId=${id}`,
  `from=2035-01-02&to=2035-01-01&propertyId=${id}`, `from=2035-01-01&to=2036-01-02&propertyId=${id}`,
  `from=2035-01-01&to=2035-01-01&propertyId=`, `from=2035-01-01&to=2035-01-01&scope=`])("rejects invalid filters: %s", async filters => {
  const response = await GET(request(filters)); expect(response.status).toBe(400);
  expect(response.headers.get("cache-control")).toBe("private, no-store"); expect(fetchBackend).not.toHaveBeenCalled();
});

it.each([400, 401, 403, 404, 500, 503])("sanitizes upstream error %i", async status => {
  fetchBackend.mockResolvedValue(Response.json({ detail: "private-sql" }, { status }));
  const response = await GET(request()); expect(response.status).toBe([400, 401, 403].includes(status) ? status : 503);
  expect(JSON.stringify(await response.json())).not.toContain("private-sql");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});

it.each([{ ...row, propertyId: other }, { ...row, date: "2035-01-04" }, { ...row, date: "2035-02-30" },
  { ...row, pendingArrivals: -1 }, { ...row, pendingDepartures: 1.5 }, { ...row, timezone: "Invalid/Timezone" },
  { ...row, currency: "" }])("rejects an invalid Backend row %j", async invalid => {
  fetchBackend.mockResolvedValue(Response.json(dto([invalid]))); expect((await GET(request())).status).toBe(503);
});

it("rejects duplicates and transport errors", async () => {
  fetchBackend.mockResolvedValueOnce(Response.json(dto([row, row]))).mockRejectedValueOnce(new Error("private-network"));
  expect((await GET(request())).status).toBe(503); expect((await GET(request())).status).toBe(503);
});
