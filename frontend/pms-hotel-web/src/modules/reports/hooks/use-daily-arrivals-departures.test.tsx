import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import type { PropertyScope } from "@/modules/properties";
import { useDailyArrivalsDepartures } from "./use-daily-arrivals-departures";

const mocks = vi.hoisted(() => ({ service: vi.fn() }));
vi.mock("../service/daily-arrivals-departures.service", () => ({ getDailyArrivalsDeparturesReport: mocks.service }));
const id = "22222222-2222-4222-8222-222222222222", other = "33333333-3333-4333-8333-333333333333";
const scope: PropertyScope = { kind: "PROPERTY", propertyIds: [id] };
const row = { propertyId: id, timezone: "America/Guatemala", currency: "GTQ", date: "2035-01-01", pendingArrivals: 2, pendingDepartures: 1 };
const dto = { calculatedAt: "2035-01-01T12:00:00Z", rows: [row] };
function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) { return <QueryClientProvider client={client}>{children}</QueryClientProvider>; };
}
beforeEach(() => { mocks.service.mockReset(); });
it("waits for explicit dates before reading and maps a valid report", async () => {
  mocks.service.mockResolvedValue(dto);
  const { result, rerender } = renderHook(({ from }: { from: string | null }) => useDailyArrivalsDepartures("staff-1", scope, from, from), {
    wrapper: wrapper(), initialProps: { from: null as string | null },
  });
  expect(mocks.service).not.toHaveBeenCalled(); rerender({ from: "2035-01-01" });
  await waitFor(() => expect(result.current.isSuccess).toBe(true)); expect(result.current.data).toEqual(dto);
  expect(mocks.service).toHaveBeenCalledWith(scope, "2035-01-01", "2035-01-01", expect.any(AbortSignal));
});
it.each([scope, { kind: "ALL_PROPERTIES" as const, propertyIds: [id] }])("rejects rows outside scope %j", async current => {
  mocks.service.mockResolvedValue({ ...dto, rows: [{ ...row, propertyId: other }] });
  const { result } = renderHook(() => useDailyArrivalsDepartures("staff-1", current, "2035-01-01", "2035-01-01"), { wrapper: wrapper() });
  await waitFor(() => expect(result.current.isError).toBe(true)); expect(result.current.data).toBeUndefined();
});
it("rejects rows outside requested days", async () => {
  mocks.service.mockResolvedValue(dto);
  const { result } = renderHook(() => useDailyArrivalsDepartures("staff-1", scope, "2035-01-02", "2035-01-03"), { wrapper: wrapper() });
  await waitFor(() => expect(result.current.isError).toBe(true));
});
it("clears results and aborts old requests when session or ALL membership changes", async () => {
  const signals: AbortSignal[] = [];
  mocks.service.mockImplementation((_scope, _from, _to, signal) => {
    signals.push(signal); return signals.length === 1 ? Promise.resolve(dto) : new Promise(() => {});
  });
  const { result, rerender, unmount } = renderHook(({ session, ids }: { session: string; ids: string[] }) =>
    useDailyArrivalsDepartures(session, { kind: "ALL_PROPERTIES", propertyIds: ids }, "2035-01-01", "2035-01-01"),
  { wrapper: wrapper(), initialProps: { session: "staff-1", ids: [id] } });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  rerender({ session: "staff-1", ids: [id, other] }); expect(result.current.data).toBeUndefined();
  await waitFor(() => expect(signals.length).toBe(2));
  rerender({ session: "staff-2", ids: [id, other] });
  await waitFor(() => expect(signals[1].aborted).toBe(true));
  unmount(); expect(signals.at(-1)?.aborted).toBe(true);
});
it("does not retry errors automatically and permits explicit recovery", async () => {
  mocks.service.mockRejectedValueOnce(new Error("Unavailable")).mockResolvedValueOnce(dto);
  const { result } = renderHook(() => useDailyArrivalsDepartures("staff-1", scope, "2035-01-01", "2035-01-01"), { wrapper: wrapper() });
  await waitFor(() => expect(result.current.isError).toBe(true)); expect(mocks.service).toHaveBeenCalledTimes(1);
  await result.current.refetch(); await waitFor(() => expect(result.current.isSuccess).toBe(true));
});
