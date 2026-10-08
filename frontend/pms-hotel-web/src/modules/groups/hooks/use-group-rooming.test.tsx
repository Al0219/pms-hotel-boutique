import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { useAddRoomingEntry, useRemoveRoomingEntry } from "./use-group-rooming";

const { addRoomingEntryMock, removeRoomingEntryMock, mapGroupMock } = vi.hoisted(() => ({
  addRoomingEntryMock: vi.fn(),
  removeRoomingEntryMock: vi.fn(),
  mapGroupMock: vi.fn((dto: { group_id: string }) => ({ id: dto.group_id })),
}));

vi.mock("../service/group-rooming.service", () => ({
  addRoomingEntry: addRoomingEntryMock,
  removeRoomingEntry: removeRoomingEntryMock,
}));

vi.mock("../mappers/group.mapper", () => ({ mapGroup: mapGroupMock }));

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useAddRoomingEntry", () => {
  it("adds a rooming entry and refreshes the groups query", async () => {
    addRoomingEntryMock.mockResolvedValueOnce({ group_id: "GRP-001" });

    const { result } = renderHook(() => useAddRoomingEntry("GT-HB-01", "http://pms.test/groups"), {
      wrapper: wrapper(),
    });

    result.current.mutate({ groupId: "GRP-001", guestName: "Ana Ruiz", roomLabel: "201" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: "GRP-001" });
    expect(addRoomingEntryMock).toHaveBeenCalledWith(
      expect.objectContaining({ groupId: "GRP-001", guestName: "Ana Ruiz", roomLabel: "201" }),
    );
  });
});

describe("useRemoveRoomingEntry", () => {
  it("removes a rooming entry and refreshes the groups query", async () => {
    removeRoomingEntryMock.mockResolvedValueOnce({ group_id: "GRP-001" });

    const { result } = renderHook(() => useRemoveRoomingEntry("GT-HB-01", "http://pms.test/groups"), {
      wrapper: wrapper(),
    });

    result.current.mutate({ groupId: "GRP-001", entryId: "RL-01" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(removeRoomingEntryMock).toHaveBeenCalledWith(
      expect.objectContaining({ groupId: "GRP-001", entryId: "RL-01" }),
    );
  });
});
