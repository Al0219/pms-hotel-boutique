import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { PropertyScope } from "@/modules/properties";
import type { DailyOnBooksExportDto } from "../dtos/daily-on-books-export.dto";
import { useDailyOnBooksExport } from "./use-daily-on-books-export";

const mocks = vi.hoisted(() => ({ service: vi.fn(), create: vi.fn(), revoke: vi.fn() }));
vi.mock("../service/daily-on-books-export.service", () => ({ getDailyOnBooksExport: mocks.service }));
const from = "2035-01-01", to = "2035-01-03";
const scope: PropertyScope = { kind: "PROPERTY", propertyIds: ["property-1"] };
const response = (): DailyOnBooksExportDto => ({ body: new Blob(["csv"]), contentType: "text/csv; charset=UTF-8",
  disposition: `attachment; filename="on-books-daily_${from}_${to}.csv"` });
let clicked: string[];
beforeEach(() => {
  mocks.service.mockReset(); mocks.create.mockReset().mockReturnValue("blob:csv-fixture"); mocks.revoke.mockReset();
  vi.stubGlobal("URL", Object.assign(class extends URL {}, { createObjectURL: mocks.create, revokeObjectURL: mocks.revoke }));
  clicked = [];
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) { clicked.push(this.download); });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("downloads only a mapped file and releases its object URL", async () => {
  mocks.service.mockResolvedValue(response());
  const { result } = renderHook(() => useDailyOnBooksExport("staff-1", scope));
  await act(() => result.current.download(from, to));
  expect(clicked).toEqual([`on-books-daily_${from}_${to}.csv`]);
  expect(result.current.status).toBe("success"); expect(mocks.revoke).toHaveBeenCalledWith("blob:csv-fixture");
  expect(document.querySelector('a[download]')).toBeNull();
});

it("guards duplicate actions before React rerenders", async () => {
  let resolve!: (value: DailyOnBooksExportDto) => void;
  mocks.service.mockReturnValue(new Promise<DailyOnBooksExportDto>(done => { resolve = done; }));
  const { result } = renderHook(() => useDailyOnBooksExport("staff-1", scope));
  let pending!: Promise<void>;
  act(() => { pending = result.current.download(from, to); void result.current.download(from, to); });
  expect(mocks.service).toHaveBeenCalledTimes(1); expect(result.current.status).toBe("pending");
  await act(async () => { resolve(response()); await pending; });
  expect(clicked).toHaveLength(1);
});

it("aborts on session/scope change and never downloads a late response", async () => {
  let resolve!: (value: DailyOnBooksExportDto) => void;
  mocks.service.mockReturnValue(new Promise<DailyOnBooksExportDto>(done => { resolve = done; }));
  const { result, rerender } = renderHook(({ session }) => useDailyOnBooksExport(session, scope), { initialProps: { session: "staff-1" } });
  let pending!: Promise<void>;
  act(() => { pending = result.current.download(from, to); });
  const signal = mocks.service.mock.calls[0][3] as AbortSignal;
  rerender({ session: "staff-2" });
  expect(signal.aborted).toBe(true); expect(result.current.status).toBe("idle");
  await act(async () => { resolve(response()); await pending; });
  expect(clicked).toEqual([]); expect(mocks.create).not.toHaveBeenCalled();
});

it("aborts on unmount", () => {
  mocks.service.mockReturnValue(new Promise(() => {}));
  const { result, unmount } = renderHook(() => useDailyOnBooksExport("staff-1", scope));
  act(() => { void result.current.download(from, to); });
  const signal = mocks.service.mock.calls[0][3] as AbortSignal;
  unmount(); expect(signal.aborted).toBe(true);
});

it("shows errors without automatic retry or fake success; explicit retry generates again", async () => {
  mocks.service.mockRejectedValueOnce(new Error("503")).mockResolvedValueOnce(response());
  const { result } = renderHook(() => useDailyOnBooksExport("staff-1", scope));
  await act(() => result.current.download(from, to));
  expect(result.current.status).toBe("error"); expect(mocks.service).toHaveBeenCalledTimes(1); expect(clicked).toEqual([]);
  await act(() => result.current.download(from, to));
  expect(mocks.service).toHaveBeenCalledTimes(2); expect(clicked).toHaveLength(1);
});

it("rejects a malformed file without creating a URL", async () => {
  mocks.service.mockResolvedValue({ ...response(), contentType: "text/html" });
  const { result } = renderHook(() => useDailyOnBooksExport("staff-1", scope));
  await act(() => result.current.download(from, to));
  expect(result.current.status).toBe("error"); expect(mocks.create).not.toHaveBeenCalled();
});
