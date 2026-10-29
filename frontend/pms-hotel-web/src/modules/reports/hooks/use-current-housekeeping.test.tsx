import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import type { PropertyScope } from "@/modules/properties";
import { useCurrentHousekeeping } from "./use-current-housekeeping";

const mocks = vi.hoisted(() => ({ service: vi.fn() }));
vi.mock("../service/current-housekeeping.service", () => ({ getCurrentHousekeepingReport: mocks.service }));
const id = "22222222-2222-4222-8222-222222222222", other = "33333333-3333-4333-8333-333333333333";
const scope: PropertyScope = { kind: "PROPERTY", propertyIds: [id] };
const row = { propertyId: id, timezone: "America/Guatemala", physicalRooms: 1, trackedRooms: 0,
  untrackedRooms: 1, dirtyRooms: 0, cleanRooms: 0, inspectedRooms: 0, dndRooms: 0 };
const dto = { calculatedAt: "2035-01-01T12:00:00Z", rows: [row] };
function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) { return <QueryClientProvider client={client}>{children}</QueryClientProvider>; };
}
beforeEach(() => { mocks.service.mockReset(); });
it("loads the current report and preserves an untracked room", async () => {
  mocks.service.mockResolvedValue(dto);
  const { result } = renderHook(() => useCurrentHousekeeping("staff-1", scope), { wrapper: wrapper() });
  await waitFor(() => expect(result.current.isSuccess).toBe(true)); expect(result.current.data).toEqual(dto);
  expect(mocks.service).toHaveBeenCalledWith(scope, expect.any(AbortSignal));
});
it.each([scope, { kind: "ALL_PROPERTIES" as const, propertyIds: [id] }])("rejects rows outside %j", async current => {
  mocks.service.mockResolvedValue({ ...dto, rows: [{ ...row, propertyId: other }] });
  const { result } = renderHook(() => useCurrentHousekeeping("staff-1", current), { wrapper: wrapper() });
  await waitFor(() => expect(result.current.isError).toBe(true)); expect(result.current.data).toBeUndefined();
});
it("clears and aborts old data when session or ALL membership changes", async () => {
  const signals: AbortSignal[] = [];
  mocks.service.mockImplementation((_scope, signal) => {
    signals.push(signal); return signals.length === 1 ? Promise.resolve(dto) : new Promise(() => {});
  });
  const { result, rerender, unmount } = renderHook(({ session, ids }: { session: string; ids: string[] }) =>
    useCurrentHousekeeping(session, { kind: "ALL_PROPERTIES", propertyIds: ids }),
  { wrapper: wrapper(), initialProps: { session: "staff-1", ids: [id] } });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  rerender({ session: "staff-1", ids: [id, other] }); expect(result.current.data).toBeUndefined();
  await waitFor(() => expect(signals.length).toBe(2));
  rerender({ session: "staff-2", ids: [id, other] });
  await waitFor(() => expect(signals[1].aborted).toBe(true));
  unmount(); expect(signals.at(-1)?.aborted).toBe(true);
});
it("does not retry source errors and permits explicit refresh", async () => {
  mocks.service.mockRejectedValueOnce(new Error("Unavailable")).mockResolvedValueOnce(dto);
  const { result } = renderHook(() => useCurrentHousekeeping("staff-1", scope), { wrapper: wrapper() });
  await waitFor(() => expect(result.current.isError).toBe(true)); expect(mocks.service).toHaveBeenCalledTimes(1);
  await result.current.refetch(); await waitFor(() => expect(result.current.isSuccess).toBe(true));
});
