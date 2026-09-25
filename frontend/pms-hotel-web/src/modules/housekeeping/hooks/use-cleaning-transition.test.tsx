import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { HttpStatusError } from "@/lib/http/errors";

import {
  useApplyCleaningTransition,
  useDiscrepancyResolutions,
  useResolveDiscrepancy,
} from "./use-cleaning-transition";

const { applyCleaningTransitionMock, listResolutionsMock, resolveDiscrepancyMock } = vi.hoisted(() => ({
  applyCleaningTransitionMock: vi.fn(),
  listResolutionsMock: vi.fn(),
  resolveDiscrepancyMock: vi.fn(),
}));

vi.mock("../service/room-cleaning-transition.service", () => ({
  applyCleaningTransition: applyCleaningTransitionMock,
  listDiscrepancyResolutions: listResolutionsMock,
  resolveDiscrepancy: resolveDiscrepancyMock,
}));

vi.mock("../mappers/room-cleaning-transition.mapper", () => ({
  mapCleaningTransitionResult: (dto: { room_id: string; property_id: string; cleaning_status: string }) => ({
    roomId: dto.room_id,
    propertyId: dto.property_id,
    status: dto.cleaning_status,
  }),
  mapDiscrepancyResolution: (dto: { room_id: string; reason: string; resolved_at: string }) => ({
    roomId: dto.room_id,
    reason: dto.reason,
    resolvedAt: new Date(dto.resolved_at),
  }),
}));

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useApplyCleaningTransition", () => {
  it("applies the transition and refreshes board queries", async () => {
    applyCleaningTransitionMock.mockResolvedValueOnce({
      room_id: "ROOM-101",
      property_id: "GT-HB-01",
      cleaning_status: "CLEAN",
    });

    const { result } = renderHook(() => useApplyCleaningTransition("GT-HB-01", "http://pms.test/room-cleaning"), {
      wrapper: wrapper(),
    });

    result.current.mutate({ roomId: "ROOM-101", toStatus: "CLEAN", reason: null });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(
      expect.objectContaining({ roomId: "ROOM-101", status: "CLEAN" }),
    );
    expect(applyCleaningTransitionMock).toHaveBeenCalledWith(
      expect.objectContaining({ roomId: "ROOM-101", toStatus: "CLEAN", reason: null }),
    );
  });

  it("surfaces mutation errors to the UI", async () => {
    applyCleaningTransitionMock.mockRejectedValueOnce(new HttpStatusError(409, "INVALID_TRANSITION"));

    const { result } = renderHook(() => useApplyCleaningTransition("GT-HB-01", "http://pms.test/room-cleaning"), {
      wrapper: wrapper(),
    });

    result.current.mutate({ roomId: "ROOM-101", toStatus: "INSPECTED", reason: null });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(HttpStatusError);
  });
});

describe("useDiscrepancyResolutions", () => {
  it("maps recorded resolutions", async () => {
    listResolutionsMock.mockResolvedValueOnce({
      resolutions: [{ room_id: "ROOM-101", reason: "Verificada", resolved_at: "2026-09-20T10:30:00.000Z" }],
    });

    const { result } = renderHook(() => useDiscrepancyResolutions("GT-HB-01", "http://pms.test/room-cleaning"), {
      wrapper: wrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([expect.objectContaining({ roomId: "ROOM-101" })]);
  });
});

describe("useResolveDiscrepancy", () => {
  it("records a resolution with its reason", async () => {
    resolveDiscrepancyMock.mockResolvedValueOnce({
      resolutions: [{ room_id: "ROOM-101", reason: "Verificada", resolved_at: "2026-09-20T10:30:00.000Z" }],
    });

    const { result } = renderHook(() => useResolveDiscrepancy("GT-HB-01", "http://pms.test/room-cleaning"), {
      wrapper: wrapper(),
    });

    result.current.mutate({ roomId: "ROOM-101", reason: "Verificada" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(resolveDiscrepancyMock).toHaveBeenCalledWith(
      expect.objectContaining({ roomId: "ROOM-101", reason: "Verificada" }),
    );
  });
});
