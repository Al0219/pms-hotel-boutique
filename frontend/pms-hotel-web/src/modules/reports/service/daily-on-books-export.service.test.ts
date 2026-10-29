import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { PropertyScope } from "@/modules/properties";
import { getDailyOnBooksExport } from "./daily-on-books-export.service";
const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });
afterEach(() => vi.unstubAllGlobals());
it.each<[PropertyScope, string]>([
  [{ kind: "PROPERTY", propertyIds: ["property-1"] }, "propertyId=property-1"],
  [{ kind: "ALL_PROPERTIES", propertyIds: ["property-1", "property-2"] }, "scope=ALL_PROPERTIES"],
])("requests the binary BFF with only its explicit filters %j", async (scope, filter) => {
  fetchMock.mockResolvedValue(new Response("csv", { headers: { "content-type": "text/csv; charset=UTF-8" } }));
  const signal = new AbortController().signal;
  await getDailyOnBooksExport(scope, "2035-01-01", "2035-01-03", signal);
  expect(fetchMock.mock.calls[0][0]).toBe(`${window.location.origin}/api/v1/private/reports/on-books/daily/export?from=2035-01-01&to=2035-01-03&${filter}`);
  expect(fetchMock.mock.calls[0][1]?.signal).toBe(signal);
});
