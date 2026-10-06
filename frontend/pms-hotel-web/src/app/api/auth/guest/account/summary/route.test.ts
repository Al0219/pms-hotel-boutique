import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const summary = { guestAccountId: "own-account", email: "own@example.test", active: true, profiles: [], linkedReservationsCount: 0, upcomingStay: null };
const fetchMock = vi.fn<typeof fetch>();
let GET: typeof import("./route").GET;

beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv("PMS_BACKEND_INTERNAL_URL", "http://backend:8080");
  vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset();
  GET = (await import("./route")).GET;
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
function request(cookie = "pms_guest_access=synthetic-guest; pms_staff_access=synthetic-staff") {
  return new NextRequest("http://localhost/api/auth/guest/account/summary?accountId=another-account", { headers: { cookie } });
}

describe("Guest own-account summary BFF", () => {
  it("uses only the Guest HttpOnly cookie and a fixed Backend target with no client UUID", async () => {
    fetchMock.mockResolvedValue(Response.json(summary));
    const response = await GET(request());
    expect(response.status).toBe(200); expect(await response.json()).toEqual(summary);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://backend:8080/api/v1/guest-auth/account/summary");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer synthetic-guest");
    expect(init?.cache).toBe("no-store");
    expect(init?.body).toBeUndefined();
  });
  it("requires Guest cookie even when Staff cookie exists", async () => {
    expect((await GET(request("pms_staff_access=synthetic-staff"))).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("propagates Backend 401 without exposing its response or credential", async () => {
    fetchMock.mockResolvedValue(Response.json({ accessToken: "synthetic" }, { status: 401 }));
    const response = await GET(request());
    expect(response.status).toBe(401); expect(await response.json()).toEqual({ error: "Guest session required" });
  });
  it.each([403, 404, 500, 503])("reports upstream %i as summary unavailable 503", async status => {
    fetchMock.mockResolvedValue(new Response(null, { status }));
    expect((await GET(request())).status).toBe(503);
  });
  it("handles network failure as 503", async () => {
    fetchMock.mockRejectedValue(new Error("synthetic transport failure"));
    expect((await GET(request())).status).toBe(503);
  });
  it("handles malformed Backend data as 503", async () => {
    fetchMock.mockResolvedValue(Response.json({ profiles: null }));
    expect((await GET(request())).status).toBe(503);
  });
  it("never forwards extra credential fields at any nesting level", async () => {
    const profile = { profileId: "p1", firstName: "Real", lastName: "Guest", preferredLanguage: null, status: "ACTIVE" };
    const stay = { reservationId: "r1", stayId: "s1", confirmationCode: "CONF1", arrival: "2026-12-01", departure: "2026-12-03" };
    fetchMock.mockResolvedValue(Response.json({ ...summary, profiles: [{ ...profile, accessToken: "nested-profile" }], upcomingStay: { ...stay, refreshToken: "nested-stay" }, accessToken: "root-access", refreshToken: "root-refresh" }));
    const data = await (await GET(request())).json();
    expect(data).toEqual({ ...summary, profiles: [profile], upcomingStay: stay });
    expect(JSON.stringify(data)).not.toMatch(/Token|root-|nested-/);
  });
});
