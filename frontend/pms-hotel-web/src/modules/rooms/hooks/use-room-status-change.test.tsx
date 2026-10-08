import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { HttpStatusError } from "@/lib/http/errors";

import { useChangeRoomStatus } from "./use-room-status-change";

const { changeRoomStatusMock } = vi.hoisted(() => ({ changeRoomStatusMock: vi.fn() }));

vi.mock("../service/room-status-change.service", () => ({ changeRoomStatus: changeRoomStatusMock }));

vi.mock("../mappers/room-status-change.mapper", () => ({
  mapRoomStatusChangeResult: (dto: { room_id: string; property_id: string; status: string }) => ({
    roomId: dto.room_id,
    propertyId: dto.property_id,
    status: dto.status,
    blockedFrom: null,
    blockedTo: null,
  }),
}));

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useChangeRoomStatus", () => {
  it("blocks a room and refreshes the board query", async () => {
    changeRoomStatusMock.mockResolvedValueOnce({
      room_id: "ROOM-103",
      property_id: "GT-HB-01",
      status: "OOO",
    });

    const { result } = renderHook(() => useChangeRoomStatus("GT-HB-01", "http://pms.test/rooms"), {
      wrapper: wrapper(),
    });

    result.current.mutate({
      roomId: "ROOM-103",
      toStatus: "OOO",
      reason: "Fuga de agua",
      startDate: "2026-09-20",
      endDate: "2026-09-25",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(expect.objectContaining({ roomId: "ROOM-103", status: "OOO" }));
    expect(changeRoomStatusMock).toHaveBeenCalledWith(
      expect.objectContaining({ roomId: "ROOM-103", toStatus: "OOO", reason: "Fuga de agua" }),
    );
  });

  it("surfaces mutation errors to the UI", async () => {
    changeRoomStatusMock.mockRejectedValueOnce(new HttpStatusError(400, "REASON_REQUIRED"));

    const { result } = renderHook(() => useChangeRoomStatus("GT-HB-01", "http://pms.test/rooms"), {
      wrapper: wrapper(),
    });

    result.current.mutate({ roomId: "ROOM-103", toStatus: "OOS", reason: "", startDate: null, endDate: null });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(HttpStatusError);
  });
});
