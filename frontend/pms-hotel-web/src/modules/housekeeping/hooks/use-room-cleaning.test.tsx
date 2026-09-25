import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError } from "@/lib/http/errors";

import { useRoomCleaning } from "./use-room-cleaning";

const { listRoomCleaningMock } = vi.hoisted(() => ({ listRoomCleaningMock: vi.fn() }));

vi.mock("../service/room-cleaning.service", () => ({ listRoomCleaning: listRoomCleaningMock }));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return function QueryWrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useRoomCleaning", () => {
  beforeEach(() => {
    listRoomCleaningMock.mockReset();
  });

  it("maps the service DTO response to Domain data", async () => {
    listRoomCleaningMock.mockResolvedValueOnce({ rooms: [{
      room_id: "RM-101",
      property_id: "GT-HB-01",
      room_label: "Habitación 101",
      cleaning_status: "DIRTY",
    }] });

    const { result } = renderHook(() => useRoomCleaning("GT-HB-01", "http://pms.test/contract/housekeeping"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([expect.objectContaining({ id: "RM-101", status: "DIRTY" })]);
    expect(listRoomCleaningMock).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: "http://pms.test/contract/housekeeping", propertyId: "GT-HB-01" }),
    );
  });

  it("does not request data without an authorized scope and confirmed endpoint", () => {
    renderHook(() => useRoomCleaning(undefined, undefined), { wrapper: createWrapper() });

    expect(listRoomCleaningMock).not.toHaveBeenCalled();
  });

  it("exposes an error and allows refetch after a network failure", async () => {
    listRoomCleaningMock.mockRejectedValueOnce(new HttpNetworkError()).mockResolvedValueOnce({ rooms: [] });

    const { result } = renderHook(() => useRoomCleaning("GT-HB-01", "http://pms.test/contract/housekeeping"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    await result.current.refetch();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
