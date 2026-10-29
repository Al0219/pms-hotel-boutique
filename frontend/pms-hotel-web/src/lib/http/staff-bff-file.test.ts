import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { staffBffFile } from "./staff-bff-file";

const mocks = vi.hoisted(() => ({ restore: vi.fn() }));
vi.mock("./staff-bff", () => ({ restoreStaffBffSession: mocks.restore }));
const backend = vi.fn<typeof fetch>();
const path = "/api/v1/private/reports/on-books/daily/export?scope=ALL_PROPERTIES";
beforeEach(() => { vi.stubGlobal("fetch", backend); backend.mockReset(); mocks.restore.mockReset(); mocks.restore.mockResolvedValue({ refreshed: true }); });
afterEach(() => vi.unstubAllGlobals());

it("reads a Blob without JSON conversion or tokens and disables caching", async () => {
  backend.mockResolvedValue(new Response(new Uint8Array([0xef, 0xbb, 0xbf, 65]), { headers: { "content-type": "text/csv; charset=UTF-8", "content-disposition": 'attachment; filename="file.csv"' } }));
  const controller = new AbortController();
  const dto = await staffBffFile(path, controller.signal);
  expect(dto.body.size).toBe(4); expect(dto.disposition).toContain("file.csv");
  const [url, init] = backend.mock.calls[0];
  expect(new URL(String(url)).origin).toBe(window.location.origin);
  expect(init).toMatchObject({ cache: "no-store", credentials: "same-origin", method: "GET", signal: controller.signal });
  expect(new Headers(init?.headers).has("authorization")).toBe(false);
});
it("restores Staff once after 401 and never loops on a second 401", async () => {
  backend.mockResolvedValue(new Response(null, { status: 401 }));
  await expect(staffBffFile(path)).rejects.toMatchObject({ status: 401 });
  expect(mocks.restore).toHaveBeenCalledTimes(1); expect(backend).toHaveBeenCalledTimes(2);
});
it("downloads once after a successful Staff restoration", async () => {
  backend.mockResolvedValueOnce(new Response(null, { status: 401 })).mockResolvedValueOnce(new Response("csv"));
  expect((await staffBffFile(path)).body.size).toBe(3);
  expect(mocks.restore).toHaveBeenCalledTimes(1); expect(backend).toHaveBeenCalledTimes(2);
});
it.each([400, 403, 406, 503])("does not restore or retry status %i", async status => {
  backend.mockResolvedValue(new Response(null, { status }));
  await expect(staffBffFile(path)).rejects.toMatchObject({ status });
  expect(backend).toHaveBeenCalledTimes(1); expect(mocks.restore).not.toHaveBeenCalled();
});
it("does not retry a network failure", async () => {
  backend.mockRejectedValue(new Error("network"));
  await expect(staffBffFile(path)).rejects.toMatchObject({ name: "HttpNetworkError" });
  expect(backend).toHaveBeenCalledTimes(1); expect(mocks.restore).not.toHaveBeenCalled();
});
it("rejects cross-origin downloads before fetch", async () => {
  await expect(staffBffFile("https://other.test/export")).rejects.toThrow("STAFF_FILE_ORIGIN_REQUIRED");
  expect(backend).not.toHaveBeenCalled();
});
it("does not refresh an aborted request", async () => {
  const controller = new AbortController(); controller.abort();
  backend.mockResolvedValue(new Response(null, { status: 401 }));
  await expect(staffBffFile(path, controller.signal)).rejects.toMatchObject({ status: 401 });
  expect(mocks.restore).not.toHaveBeenCalled();
});
