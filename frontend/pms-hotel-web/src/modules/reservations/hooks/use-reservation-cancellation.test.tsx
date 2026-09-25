import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HttpStatusError } from "@/lib/http/errors";

import { useApplyCancellation, useCancellationPreview } from "./use-reservation-cancellation";

afterEach(() => cleanup());

const { previewCancellationMock, applyCancellationMock } = vi.hoisted(() => ({
  previewCancellationMock: vi.fn(),
  applyCancellationMock: vi.fn(),
}));

vi.mock("../service/reservation.service", () => ({
  previewCancellation: previewCancellationMock,
  applyCancellation: applyCancellationMock,
}));

const ENDPOINT = "http://pms.test/contract/reservations";

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return {
    queryClient,
    QueryWrapper: function QueryWrapper({ children }: Readonly<{ children: ReactNode }>) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    },
  };
}

function previewDto() {
  return {
    reservation_id: "HB-2026-08421",
    policy_summary: "Flexible 48h · Viajes Maya.",
    cutoff_at: "2026-08-26T15:00:00",
    penalty_amount: "1160",
    refund_amount: "0",
    release_note: "Deluxe King 203 · 28–31 ago",
    can_cancel: true,
    reason: null,
  };
}

function applyDto() {
  return {
    reservation_id: "HB-2026-08421",
    status: "CANCELLED",
    cancelled_at: "2026-08-28T09:30:00",
    penalty_amount: "1160",
    refund_amount: "0",
    message: "Penalty Charge Q1,160 · Refund Q 0 · ATS +1/noche",
  };
}

describe("useCancellationPreview", () => {
  beforeEach(() => {
    previewCancellationMock.mockReset();
  });

  it("maps the preview only when the panel is open and scope is resolved", async () => {
    previewCancellationMock.mockResolvedValueOnce(previewDto());

    const { result } = renderHook(() => useCancellationPreview("GT-HB-01", ENDPOINT, "HB-2026-08421", true), {
      wrapper: createWrapper().QueryWrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(expect.objectContaining({ reservationId: "HB-2026-08421", canCancel: true }));
    expect(previewCancellationMock).toHaveBeenCalledWith(expect.objectContaining({
      endpoint: ENDPOINT,
      propertyId: "GT-HB-01",
      reservationId: "HB-2026-08421",
    }));
  });

  it("does not request while the panel is closed", () => {
    renderHook(() => useCancellationPreview("GT-HB-01", ENDPOINT, "HB-2026-08421", false), {
      wrapper: createWrapper().QueryWrapper,
    });

    expect(previewCancellationMock).not.toHaveBeenCalled();
  });
});

describe("useApplyCancellation", () => {
  beforeEach(() => {
    applyCancellationMock.mockReset();
  });

  it("posts the reason and invalidates center + preview queries on success", async () => {
    applyCancellationMock.mockResolvedValueOnce(applyDto());
    const { queryClient, QueryWrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useApplyCancellation("GT-HB-01", ENDPOINT, "HB-2026-08421"), {
      wrapper: QueryWrapper,
    });

    result.current.mutate("Cambio de planes del huésped");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(expect.objectContaining({ status: "CANCELLED", reservationId: "HB-2026-08421" }));
    expect(applyCancellationMock).toHaveBeenCalledWith({
      endpoint: ENDPOINT,
      propertyId: "GT-HB-01",
      reservationId: "HB-2026-08421",
      reason: "Cambio de planes del huésped",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["reservations", "GT-HB-01", ENDPOINT] });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["reservations", "cancellation-preview", "GT-HB-01", ENDPOINT, "HB-2026-08421"],
    });
  });

  it("exposes a failed apply as mutation error and never sets CANCELLED", async () => {
    applyCancellationMock.mockRejectedValueOnce(new HttpStatusError(409, "CONFLICT"));
    const { QueryWrapper } = createWrapper();

    const { result } = renderHook(() => useApplyCancellation("GT-HB-01", ENDPOINT, "HB-2026-08421"), {
      wrapper: QueryWrapper,
    });

    result.current.mutate("Cambio de planes del huésped");
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(HttpStatusError);
    expect(result.current.data).toBeUndefined();
  });
});