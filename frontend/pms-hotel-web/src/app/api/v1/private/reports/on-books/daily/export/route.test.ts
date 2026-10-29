import { NextRequest } from "next/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const backend = vi.fn<typeof fetch>();
let GET: typeof import("./route").GET;
let HEAD: typeof import("./route").HEAD;
const property = "22222222-2222-4222-8222-222222222222";
const query = `from=2035-01-01&to=2035-01-03&propertyId=${property}`;
const disposition = 'attachment; filename="on-books-daily_2035-01-01_2035-01-03.csv"';
const bytes = new TextEncoder().encode("\uFEFFpropertyId,stayDate\r\nfixture,2035-01-01\r\n");
function request(params = query, cookie = "pms_staff_access=staff-token; pms_guest_access=guest-token", accept = "text/csv") {
  return new NextRequest(`http://localhost/api/v1/private/reports/on-books/daily/export?${params}`, {
    headers: { cookie, accept, authorization: "Bearer browser-token" },
  });
}
function csv(extra: Record<string, string> = {}) {
  return new Response(bytes, { headers: { "content-type": "text/csv; charset=UTF-8", "content-disposition": disposition, ...extra } });
}
beforeEach(async () => {
  vi.resetModules(); backend.mockReset(); vi.stubEnv("PMS_BACKEND_INTERNAL_URL", "http://backend:8080");
  vi.stubGlobal("fetch", backend); ({ GET, HEAD } = await import("./route"));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("does not generate a file for a HEAD probe", () => {
  expect(HEAD().status).toBe(405); expect(backend).not.toHaveBeenCalled();
});

it("preserves bytes/BOM with Staff auth and emits only approved download headers", async () => {
  backend.mockResolvedValue(csv({ "set-cookie": "internal=secret", "x-internal": "secret", authorization: "secret" }));
  const response = await GET(request());
  expect(response.status).toBe(200);
  expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual(Array.from(bytes));
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("content-disposition")).toBe(disposition);
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  for (const key of ["set-cookie", "authorization", "x-internal"]) expect(response.headers.has(key)).toBe(false);
  const [url, init] = backend.mock.calls[0];
  expect(url).toBe(`http://backend:8080/api/v1/reports/on-books/daily/export?${query}`);
  expect(new Headers(init?.headers).get("authorization")).toBe("Bearer staff-token");
  expect(new Headers(init?.headers).get("accept")).toBe("text/csv");
  expect(init?.cache).toBe("no-store"); expect(init?.signal).toBeDefined();
});

it("forwards only explicit ALL_PROPERTIES, without property lists or organization filters", async () => {
  backend.mockResolvedValue(csv());
  expect((await GET(request("from=2035-01-01&to=2035-01-03&scope=ALL_PROPERTIES"))).status).toBe(200);
  expect(backend.mock.calls[0][0]).toContain("scope=ALL_PROPERTIES");
});

it("does not accept a Guest cookie or client bearer as Staff identity", async () => {
  const response = await GET(request(query, "pms_guest_access=guest"));
  expect(response.status).toBe(401); expect(backend).not.toHaveBeenCalled();
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});

it.each(["", "from=2035-01-01&to=2035-01-03", `${query}&scope=ALL_PROPERTIES`, `${query}&organizationId=other`,
  `${query}&from=2035-01-01`, `${query}&propertyId=${property}`, `from=2035-02-30&to=2035-03-02&propertyId=${property}`,
  `from=2035-01-02&to=2035-01-01&propertyId=${property}`, `from=2035-01-01&to=2036-01-02&propertyId=${property}`,
  "from=2035-01-01&to=2035-01-03&scope=GLOBAL", "from=2035-01-01&to=2035-01-03&propertyId=bad"])
("rejects filters before requesting Backend: %s", async params => {
  const response = await GET(request(params));
  expect(response.status).toBe(400); expect(backend).not.toHaveBeenCalled();
  expect(response.headers.get("content-disposition")).toBeNull();
});

it.each(["application/json", "text/csv;q=0, */*;q=1"])("rejects incompatible Accept %s before generation", async accept => {
  expect((await GET(request(query, undefined, accept))).status).toBe(406); expect(backend).not.toHaveBeenCalled();
});

it.each([400, 401, 403, 406, 500, 503])("preserves public error %i without downloading or leaking its body", async status => {
  backend.mockResolvedValue(Response.json({ internal: "sensitive" }, { status }));
  const response = await GET(request());
  expect(response.status).toBe(status >= 500 ? 503 : status);
  expect(await response.text()).not.toContain("sensitive");
  expect(response.headers.get("content-disposition")).toBeNull();
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(backend).toHaveBeenCalledTimes(1);
});

it.each(["mime", "name", "bom", "json"])("rejects an invalid upstream %s response", async kind => {
  backend.mockResolvedValue(kind === "mime" ? csv({ "content-type": "text/html" }) : kind === "name"
    ? csv({ "content-disposition": 'attachment; filename="../secret.csv"' }) : kind === "json"
      ? Response.json({ secret: "internal" }) : new Response("csv-without-bom", { headers: { "content-type": "text/csv; charset=UTF-8", "content-disposition": disposition } }));
  expect((await GET(request())).status).toBe(503); expect(backend).toHaveBeenCalledTimes(1);
});

it("does not retry a failed generation after network failure", async () => {
  backend.mockRejectedValue(new Error("sensitive-network-path"));
  const response = await GET(request());
  expect(response.status).toBe(503); expect(await response.text()).not.toContain("sensitive"); expect(backend).toHaveBeenCalledTimes(1);
});
