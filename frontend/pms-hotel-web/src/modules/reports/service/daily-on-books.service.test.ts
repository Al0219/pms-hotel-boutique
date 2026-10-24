import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { PropertyScope } from "@/modules/properties";

import { getDailyOnBooksReport } from "./daily-on-books.service";

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://external.test"); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it.each<[PropertyScope, string]>([
  [{ kind: "PROPERTY", propertyIds: ["property-1"] }, "propertyId=property-1"],
  [{ kind: "ALL_PROPERTIES", propertyIds: ["property-1"] }, "scope=ALL_PROPERTIES"],
])("requests the same-origin Staff BFF for scope %j", async (scope, expectedFilter) => {
  fetchMock.mockResolvedValue(Response.json({ calculatedAt: "2035-01-01T12:00:00Z", rows: [] }));
  await getDailyOnBooksReport(scope, "2035-01-01", "2035-01-03");
  const [url, init] = fetchMock.mock.calls[0];
  expect(String(url)).toContain(`/api/v1/private/reports/on-books/daily?from=2035-01-01&to=2035-01-03&${expectedFilter}`);
  expect(new Headers(init?.headers).has("authorization")).toBe(false);
});
