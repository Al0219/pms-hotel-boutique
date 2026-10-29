import { NextRequest } from "next/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const fetchBackend = vi.fn<typeof fetch>();
let GET: typeof import("./route").GET;
const id = "22222222-2222-4222-8222-222222222222", other = "33333333-3333-4333-8333-333333333333";
const row = { propertyId: id, timezone: "America/Guatemala", physicalRooms: 4, trackedRooms: 3, untrackedRooms: 1,
  dirtyRooms: 1, cleanRooms: 1, inspectedRooms: 1, dndRooms: 1 };
const dto = (rows = [row]) => ({ calculatedAt: "2035-01-01T12:00:00Z", rows });
function request(filters = `propertyId=${id}`, cookie = "pms_staff_access=staff-token; pms_guest_access=guest-token") {
  return new NextRequest(`http://localhost/api/v1/private/reports/housekeeping/current?${filters}`, {
    headers: { cookie, authorization: "Bearer browser-token" },
  });
}
beforeEach(async () => {
  vi.resetModules(); vi.stubEnv("PMS_BACKEND_INTERNAL_URL", "http://backend:8080");
  vi.stubGlobal("fetch", fetchBackend); fetchBackend.mockReset(); GET = (await import("./route")).GET;
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("uses Staff HttpOnly, projects counts and excludes extra fields with private no-store", async () => {
  fetchBackend.mockResolvedValue(Response.json({ ...dto(), token: "private", rows: [{ ...row, roomNumber: "101" }] }));
  const response = await GET(request());
  expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toEqual(dto());
  const [url, init] = fetchBackend.mock.calls[0];
  expect(url).toBe(`http://backend:8080/api/v1/reports/housekeeping/current?propertyId=${id}`);
  expect(new Headers(init?.headers).get("authorization")).toBe("Bearer staff-token");
  expect(init?.cache).toBe("no-store"); expect(init?.signal).toBeInstanceOf(AbortSignal);
});
it("forwards ALL and accepts an empty rows array", async () => {
  fetchBackend.mockResolvedValue(Response.json(dto([])));
  expect(await (await GET(request("scope=ALL_PROPERTIES"))).json()).toEqual(dto([]));
  expect(fetchBackend.mock.calls[0][0]).toContain("scope=ALL_PROPERTIES");
});
it("rejects Guest-only requests", async () => {
  const response = await GET(request(`propertyId=${id}`, "pms_guest_access=guest-token"));
  expect(response.status).toBe(401); expect(fetchBackend).not.toHaveBeenCalled();
});
it.each(["", "scope=", "propertyId=", "propertyId=invalid", `propertyId=${id}&scope=ALL_PROPERTIES`,
  `propertyId=${id}&propertyId=${id}`, `propertyId=${id}&from=2035-01-01`, "scope=all_properties"])("rejects invalid query %s", async filters => {
  const response = await GET(request(filters)); expect(response.status).toBe(400);
  expect(response.headers.get("cache-control")).toBe("private, no-store"); expect(fetchBackend).not.toHaveBeenCalled();
});
it.each([400, 401, 403, 404, 500, 503])("sanitizes Backend error %i", async status => {
  fetchBackend.mockResolvedValue(Response.json({ detail: "private-sql" }, { status }));
  const response = await GET(request()); expect(response.status).toBe([400, 401, 403].includes(status) ? status : 503);
  expect(JSON.stringify(await response.json())).not.toContain("private-sql");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});
it.each([{ ...row, propertyId: other }, { ...row, timezone: "Invalid/Timezone" }, { ...row, physicalRooms: 3 },
  { ...row, trackedRooms: 4 }, { ...row, dndRooms: 4 }, { ...row, dirtyRooms: -1 }, { ...row, cleanRooms: 1.5 },
  { ...row, untrackedRooms: Number.MAX_SAFE_INTEGER + 1 }])("rejects invalid Backend counts/scope %j", async invalid => {
  fetchBackend.mockResolvedValue(Response.json(dto([invalid]))); expect((await GET(request())).status).toBe(503);
});
it("rejects duplicate properties and source errors", async () => {
  fetchBackend.mockResolvedValueOnce(Response.json(dto([row, row]))).mockRejectedValueOnce(new Error("private-network"));
  expect((await GET(request())).status).toBe(503); expect((await GET(request())).status).toBe(503);
});
