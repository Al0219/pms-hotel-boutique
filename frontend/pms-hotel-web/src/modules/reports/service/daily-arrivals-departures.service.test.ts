import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { PropertyScope } from "@/modules/properties";
import { getDailyArrivalsDeparturesReport } from "./daily-arrivals-departures.service";

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://external.test"); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it.each<[PropertyScope, string]>([
  [{ kind: "PROPERTY", propertyIds: ["property-1"] }, "propertyId=property-1"],
  [{ kind: "ALL_PROPERTIES", propertyIds: ["property-1"] }, "scope=ALL_PROPERTIES"],
])("uses same-origin Staff transport and explicit filters for %j", async (scope, filter) => {
  fetchMock.mockResolvedValue(Response.json({ calculatedAt: "2035-01-01T12:00:00Z", rows: [] }));
  const signal = new AbortController().signal;
  await getDailyArrivalsDeparturesReport(scope, "2035-01-01", "2035-01-03", signal);
  const [url, init] = fetchMock.mock.calls[0];
  expect(String(url)).toContain(`/api/v1/private/reports/arrivals-departures/daily?from=2035-01-01&to=2035-01-03&${filter}`);
  expect(new Headers(init?.headers).has("authorization")).toBe(false); expect(init?.signal).toBe(signal);
});
